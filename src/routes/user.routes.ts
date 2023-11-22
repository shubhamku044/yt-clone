import { IRouter, Router } from 'express';
import { registerUser } from '../controllers/user.controller.js';

const router: IRouter = Router();

router.route('/register').post(registerUser);

export default router;
