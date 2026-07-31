import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import notesRouter from "./notes";
import flashcardsRouter from "./flashcards";
import glossaryRouter from "./glossary";
import branchesRouter from "./branches";
import setsRouter from "./sets";
import searchRouter from "./search";
import statsRouter from "./stats";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(notesRouter);
router.use(flashcardsRouter);
router.use(glossaryRouter);
router.use(branchesRouter);
router.use(setsRouter);
router.use(searchRouter);
router.use(statsRouter);
router.use(aiRouter);

export default router;
