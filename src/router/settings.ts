import express from 'express';
import { createSpaSettings, getSpaSettings, updateSpaSettings } from '../controller/settings';

export default (router: express.Router) => {
    router.post('/settings', createSpaSettings);
    router.get('/settings', getSpaSettings);
    router.patch('/settings', updateSpaSettings);
}