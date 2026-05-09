import { hostingerService } from '../../services/hostingerService';

export const syncFileToDrive = async (
    originalName: string,
    storagePath: string,
    fileSize: number,
    fileType: string,
    folderName: string,
    uploadedBy: string = 'admin'
) => {
    try {
        const folderInfo = await hostingerService.getDriveFolder(folderName);

        await hostingerService.registerDriveFile({
            name: originalName,
            path: storagePath,
            size: fileSize,
            type: fileType || 'application/octet-stream',
            folder_id: folderInfo?.id || null,
            uploaded_by: uploadedBy
        });
        console.log(`Synced ${originalName} to Drive folder: ${folderName}`);
    } catch (error) {
        console.error("Failed to sync file to Drive:", error);
    }
};

