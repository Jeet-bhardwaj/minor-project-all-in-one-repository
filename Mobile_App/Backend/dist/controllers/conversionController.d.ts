import { Request, Response, NextFunction } from 'express';
export interface ConversionRequest extends Request {
    userId?: string;
    conversionId?: string;
    file?: any;
}
/**
 * Audio to Image Conversion Controller
 */
export declare function audioToImageController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Image to Audio Conversion Controller
 */
export declare function imageToAudioController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get Conversion Status Controller
 */
export declare function getConversionStatusController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * List All Conversions Controller
 */
export declare function listConversionsController(_req: ConversionRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Download Conversion File Controller
 */
export declare function downloadConversionController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    audioToImageController: typeof audioToImageController;
    imageToAudioController: typeof imageToAudioController;
    getConversionStatusController: typeof getConversionStatusController;
    listConversionsController: typeof listConversionsController;
    downloadConversionController: typeof downloadConversionController;
};
export default _default;
//# sourceMappingURL=conversionController.d.ts.map