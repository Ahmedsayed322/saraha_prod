import { env } from '../../config/index.js';

import { dbService, redis_client, USER } from '../../DB/index.js';
import {
  ApiError,
  asymmetric,
  hashSecurity,
  mailService,
  otpTypes,
  pages,
  provider,
} from '../../utils/index.js';
import { JWT, OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cloudinary from '../../utils/cloudinary/cloudinary.js';
import {
  Decryption,
  Encryption,
} from '../../utils/security/asymmetricEncryption.security.js';
import crypto, { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import {
  otpCreateAccountKey,
  deleteKey,
  getRevokeTokenKey,
  getValue,
  revokedKey,
  setValue,
  otpKey,
  loginTries,
  loginKey,
  faTrigger,
  forgetPasswordOTP,
  forgetPasswordTries,
} from '../../DB/redis/redis.service.js';
import EventEmitter from 'events';
const event = new EventEmitter();
event.on('send email', async (fn) => {
  return await fn();
});
export const signup = async (req) => {
  const { firstName, lastName, email, password, phone } = req.body;
  const exists = await dbService.findOneDoc(USER, { filter: { email } });
  if (exists) {
    throw new ApiError('this email already exists', 409);
  }
  const otp = randomInt(100000, 999999).toString();

  const hashedOTP = await hashSecurity.hash(otp, 'argon');
  const hashedPassword = await hashSecurity.hash(password, 'argon');

  await setValue({
    key: otpCreateAccountKey(email),
    value: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
    },
    ttl: 24 * 60 * 60,
  });
  await setValue({
    key: otpKey(email),
    value: hashedOTP,
    ttl: 300,
  });
  event.emit('send email', async () => {
    await mailService.sendOTP(
      email,
      'Confirm Your Email',
      'Your OTP',
      pages.otpPage(otp),
    );
  });
};
export const confirmAccount = async (data) => {
  const { email, otp } = data;
  const user = await getValue(otpCreateAccountKey(email));
  const hashedOTP = await getValue(otpKey(email));
  if (!hashedOTP || !user) {
    throw new ApiError('OTP expired ', 400);
  }
  const isValid = await hashSecurity.checkHash(
    otp.toString(),
    hashedOTP,
    'argon',
  );
  if (!isValid) {
    throw new ApiError('invalid OTP ', 400);
  }

  await dbService.createDoc(USER, {
    data: { ...user },
  });
  await deleteKey([otpKey(email)]);
  await deleteKey([otpCreateAccountKey(email)]);
};
const verifyGmail = async (idToken) => {
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.CLIENT_IDS,
  });
  const payload = ticket.getPayload();
  if (!payload.email_verified) {
    throw new ApiError('failed to verify this account', 400);
  }
  return payload;
};
export const GmailSignUp = async ({ idToken }) => {
  const payload = await verifyGmail(idToken);
  const { email, email_verified, name, picture } = payload;
  const chkEmail = await dbService.findOneDoc(USER, {
    filter: {
      email,
    },
  });
  const tokenId = randomUUID();
  if (chkEmail) {
    if (chkEmail.provider === provider.google) {
      const accessToken = await chkEmail.generateToken('access', tokenId);
      const refreshToken = await chkEmail.generateToken('refresh', tokenId);
      return { accessToken, refreshToken, created: false };
    }
    throw new ApiError('please login with email and password', 400);
  }
  const newUser = await dbService.createDoc(USER, {
    data: {
      email,
      fullName: name,
      provider: provider.google,
      isConfirmed: email_verified ? true : undefined,
      profilePic: picture,
    },
  });

  const accessToken = await newUser.generateToken('access', tokenId);
  const refreshToken = await newUser.generateToken('refresh', tokenId);
  return { accessToken, refreshToken, created: true };
};
export const uploadPic = async (req) => {
  const { public_id, secure_url } = await cloudinary.uploader.upload(
    req.file.path,
    {
      folder: 'profilePics',
      public_id: `${req.user._id}_${Date.now()}`,
      use_filename: true,
    },
  );
  if (req.user.profilePic?.public_id) {
    const galleryPic = await cloudinary.uploader.upload(
      req.user.profilePic.secure_url,
      {
        folder: 'gallery',
        public_id: req.user.profilePic.public_id.split('/')[1],
        use_filename: true,
      },
    );
    const result = await cloudinary.uploader.destroy(
      req.user.profilePic.public_id,
    );
    req.user.gallery.push({
      public_id: galleryPic.public_id,
      secure_url: galleryPic.secure_url,
    });
  }
  req.file.profilePicId = public_id;
  req.user.profilePic = {
    public_id,
    secure_url,
  };
  await req.user.save();
};
export const refreshToken = async ({ decoded }) => {
  const user = await dbService.findOneDoc(USER, {
    filter: { _id: decoded.id },
  });
  if (!user) {
    throw new ApiError('invalid refresh token', 401);
  }
  const accessToken = await user.generateToken('access', decoded.jti);
  return accessToken;
};
export const shareProfile = async (userId) => {
  const user = await dbService.findDocById(USER, {
    id: userId,
    select: [
      'firstName',
      'lastName',
      'fullName',
      'email',
      'phone',
      'profilePic',
      'visitCount',
    ],
  });
  if (!user) {
    throw new ApiError('user not found', 404);
  }
  await dbService.updateOneDoc(USER, {
    filter: { _id: userId },
    update: { $inc: { visitCount: 1 } },
  });
  const userObj = user.toObject();

  userObj.phone = await Decryption(userObj.phone);
  delete userObj.visitCount;
  return userObj;
};
export const updateProfile = async (req) => {
  await dbService.updateOneDoc(USER, {
    filter: { _id: req.user._id },
    update: {
      ...req.body,
      phone: req.body.phone
        ? await asymmetric.Encryption(req.body.phone)
        : undefined,
    },
  });
  const user = await dbService.findDocById(USER, {
    id: req.user._id,
    select: ['-__v', '-createdAt', '-updatedAt', '-password'],
  });
  user.phone = await asymmetric.Decryption(user.phone);
  const userObj = user.toObject();
  delete userObj.visitCount;
  delete userObj.password;
  await setValue({
    key: `profile::${user.id}`,
    value: userObj,
    ttl: 120,
  });
};
export const updatePassword = async (req) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  const chkPassword = await hashSecurity.checkHash(
    currentPassword,
    req.user.password,
    'argon',
  );
  if (!chkPassword) {
    throw new ApiError('invalid current password', 400);
  }
  if (newPassword !== confirmPassword) {
    throw new ApiError('new password and confirm password do not match', 400);
  }
  req.user.password = await hashSecurity.hash(newPassword, 'argon');
  await req.user.save();
};
export const logout = async ({ user, query, decoded }) => {
  const { flag } = query;
  if (flag === 'all') {
    user.changeCredentials = Date.now();
    await user.save();
    await deleteKey(await redis_client.keys(getRevokeTokenKey(user._id)));
    return;
  }
  await setValue({
    key: revokedKey({ userId: user.id, jti: decoded.jti }),
    value: `${decoded.jti}`,
    ttl: decoded.exp - Math.floor(Date.now() / 1000),
  });
};
export const userProfile = async (user) => {
  const exist = await getValue(`profile::${user.id}`);
  if (exist) {

    return exist;
  }
  const userObj = user.toObject();
  delete userObj.visitCount;
  delete userObj.password;
  await setValue({
    key: `profile::${user.id}`,
    value: userObj,
    ttl: 120,
  });
  return userObj;
};
export const removeProfilePicture = async (user) => {
  await cloudinary.uploader.destroy(user.profilePic.public_id);
  user.profilePic = undefined;
  await user.save();
  //unlink for HD
};
export const getViewCount = async (userId) => {
  const visitCount = await dbService.findDocById(USER, {
    id: userId,
    select: ['visitCount', 'firstName', 'lastName'],
  });
  if (!visitCount) {
    throw new ApiError('user not found', 404);
  }
  return visitCount;
};
export const uploadCoverPics = async (req) => {
  const numOfFiles = req.files?.length;
  const coverPicsCount = req.user.coverPics?.length || 0;

  if (coverPicsCount + numOfFiles !== 2) {
    throw new ApiError(
      'Total number of cover pictures must equal exactly 2',
      400,
    );
  }

  for (const file of req.files) {
    const { public_id, secure_url } = await cloudinary.uploader.upload(
      file.path,
      {
        folder: 'coverPics',
      },
    );
    req.user.coverPics.push({ public_id, secure_url });
  }

  await req.user.save();
};
const checkNumberOfTrials = async (value, email) => {
  switch (value) {
    case 'login':
      let numberOfTries = (await getValue(loginTries(email))) || 0;
      if (numberOfTries >= 5)
        throw new ApiError(
          'Too many attempts. Please try again in 5 minutes.',
          429,
        );
      return numberOfTries;
    case 'forgetPassword':
      let tries = (await getValue(forgetPasswordTries(email))) || 0;


      if (tries >= 3) {
        throw new ApiError('Too many attempts', 429);
      }
      return tries;
  }
};
const sendEmail = async (type, email) => {
  const otp = randomInt(100000, 999999).toString();
  const hashedOTP = await hashSecurity.hash(otp, 'argon');
  let key = '';
  let message = '';
  switch (type) {
    case 'login':
      key = loginKey(email);
      message = 'login OTP';
      break;
    case 'forgetPassword':
      key = forgetPasswordOTP(email);
      message = 'forget password OTP';
      break;
  }
  await setValue({
    key: key,
    value: hashedOTP,
    ttl: 300,
  });
  event.emit('send email', () =>
    mailService.sendOTP(email, message, 'Your OTP', pages.otpPage(otp)),
  );

};
export const login = async (data) => {
  const { email, password } = data;
  let numberOfTries = await checkNumberOfTrials('login', email);
  const user = await dbService.findOneDoc(USER, {
    filter: { email, password: { $exists: 1 } },
  });
  if (!user) {
    const newValue = numberOfTries + 1;
    await setValue({
      key: loginTries(email),
      value: newValue,
      ttl: numberOfTries === 0 ? 60 * 5 : undefined,
    });
    throw new ApiError('invalid email or password', 401);
  }
  const isValid = await hashSecurity.checkHash(
    password,
    user.password,
    'argon',
  );
  if (!isValid) {
    const newValue = numberOfTries + 1;
    await setValue({
      key: loginTries(email),
      value: newValue,
      ttl: numberOfTries === 0 ? 60 * 5 : undefined,
    });
    throw new ApiError('invalid email or password', 401);
  }
  if (user.FA) {
    await sendEmail('login', email);

    return 'OTP Sent to your mail';
  }
  const tokenId = randomUUID();
  const accessToken = user.generateToken('access', tokenId);
  const refreshToken = user.generateToken('refresh', tokenId);
  await deleteKey([loginTries(email)]);
  return { accessToken, refreshToken };
};
export const confirmLoginOTP = async ({ email, otp }) => {
  const hashedOTP = await getValue(loginKey(email));
  if (!hashedOTP) {
    throw new ApiError('invalid otp', 400);
  }
  const isValid = await hashSecurity.checkHash(otp, hashedOTP, 'argon');
  if (!isValid) {
    throw new ApiError('invalid otp', 400);
  }
  const user = await dbService.findOneDoc(USER, {
    filter: { email },
  });
  const tokenId = randomUUID();
  const accessToken = user.generateToken('access', tokenId);
  const refreshToken = user.generateToken('refresh', tokenId);
  await deleteKey([loginTries(email)]);
  await deleteKey([loginKey(email)]);
  return { accessToken, refreshToken };
};
export const forgetPassword = async ({ email }) => {
  let tries = await checkNumberOfTrials('forgetPassword', email);
  const user = await dbService.findOneDoc(USER, {
    filter: { email },
  });
  if (!user) {
    await setValue({
      key: forgetPasswordTries(email),
      value: ++tries,
      ttl: tries === 0 ? 60 * 5 : undefined,
    });
    throw new ApiError('user not found', 404);
  }
  await sendEmail('forgetPassword', email);
};
export const confirmForgetPasswordOTP = async ({ otp, email, newPassword }) => {
  const hashedOTP = await getValue(forgetPasswordOTP(email));
  if (!hashedOTP) {
    throw new ApiError('invalid otp', 401);
  }
  const isValid = await hashSecurity.checkHash(otp, hashedOTP, 'argon');
  if (!isValid) {
    throw new ApiError('invalid otp', 401);
  }
  const user = await dbService.findOneDoc(USER, {
    filter: { email },
  });
  await deleteKey([forgetPasswordOTP(email)]);
  user.password = await hashSecurity.hash(newPassword, 'argon');
  user.changeCredentials = Date.now();
  await user.save({ validateModifiedOnly: true });
};
export const trigger2Fa = async (user) => {
  const otp = randomInt(100000, 999999).toString();
  const hashedOTP = await hashSecurity.hash(otp, 'argon');
  await setValue({
    key: faTrigger(user._id),
    value: hashedOTP,
    ttl: 300,
  });
  await mailService.sendOTP(
    user.email,
    'Enable 2FA',
    'Your OTP',
    pages.otpPage(otp),
  );
  if (env.NODE_ENV === 'development') {
    console.log(otp);
  }
};
export const confirmTrigger2FA = async (user, otp) => {
  const hashedOTP = await getValue(faTrigger(user._id));
  if (!hashedOTP) {
    throw new ApiError('invalid otp', 401);
  }
  const isValid = await hashSecurity.checkHash(otp, hashedOTP, 'argon');
  if (!isValid) {
    throw new ApiError('invalid otp', 401);
  }
  await deleteKey([faTrigger(user._id)]);
  user.FA = !user.FA;
  await user.save({ validateModifiedOnly: true });
};
export const forgetPasswordLink = async (req) => {
  const { email } = req.body;
  const user = await dbService.findOneDoc(USER, {
    filter: {
      email,
    },
  });
  if (!user) {
    throw new ApiError('user not found', 404);
  }
  const tokenId = randomUUID();
  const resetToken = user.generateToken('reset', tokenId);
  const{APP_BASE_URL}=env  
  event.emit('send email', async () => {
    await mailService.sendOTP(
      email,
      'Forget Password',
      'Your Activision link',
      `<p style="font-size:13px">${APP_BASE_URL}users/confirm-forget-password-link?resetToken=${resetToken}<p/>`,
    );
  });
};
export const forgetPasswordLinkConfirmation = async (req) => {
  const { resetToken } = req.query;
  const { newPassword } = req.body;
  let decoded = jwt.verify(resetToken, env.RESET_TOKEN_SECRET);
  const isRevoked = await getValue(
    `revoked::forgetPasswordToken::${decoded.jti}`,
  );
  if (isRevoked) {
    throw new ApiError('invalid link', 400);
  }
  const user = await dbService.findDocById(USER, { id: decoded.id });
  if (!user) {
    throw new ApiError('invalid link', 400);
  }
  user.password = await hashSecurity.hash(newPassword, 'argon');
  user.changeCredentials = Date.now();
  await user.save({ validateModifiedOnly: true });
  await setValue({
    key: `revoked::forgetPasswordToken::${decoded.jti}`,
    value: true,
    ttl: 15 * 60,
  });
};
