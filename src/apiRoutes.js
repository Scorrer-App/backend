import express from "express";

import auth from "./modules/Auth/routes/auth.routes.js";
import cricket from "./modules/cricket/routes/cricket.routes.js";
import kabaddi from "./modules/kabaddi/routes/kabaddi.routes.js";


const router = express.Router();

router.use('/auth', auth);
router.use('/cricket', cricket);
router.use('/kabaddi', kabaddi);



export default router;