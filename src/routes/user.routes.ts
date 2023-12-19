import { IRouter, Router } from 'express';
import { loginUser, logoutUser, refreshAccessToken, registerUser } from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router: IRouter = Router();

router
  .route('/register')
  .post(
    upload.fields([
      {
        name: 'avatar',
        maxCount: 1
      },
      {
        name: 'coverImage',
        maxCount: 1
      }
    ]),
    registerUser
  );
router.route('/login').post(loginUser);
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refresh-token').post(refreshAccessToken);

export default router;
