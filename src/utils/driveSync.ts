import { supabase } from '../services/supabase';

export const syncFileToDrive = async (
    originalName: string,
    storagePath: string,
    fileSize: number,
    fileType: string,
    folderName: string,
    uploadedBy: string = 'admin'
) => {
    try {
        const { data: folderInfo } = await supabase.from('drive_folders')
            .select('id')
            .eq('name', folderName)
            .maybeSingle();

        await supabase.from('drive_files').insert({
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
