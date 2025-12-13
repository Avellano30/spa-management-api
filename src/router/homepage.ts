import express from 'express';
import { upload } from "../middleware/upload";
import {
    createHomepageSettings,
    getHomepageSettings,
    updateHomepageSettings
} from "../controller/homepage";

export default (router: express.Router) => {
    router.post('/homepage-settings', upload.single("logo"), createHomepageSettings);
    router.get('/homepage-settings', getHomepageSettings);
    router.patch('/homepage-settings', upload.single("logo"), updateHomepageSettings);
};
