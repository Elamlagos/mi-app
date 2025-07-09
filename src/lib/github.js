import { supabase } from './supabase';

export const uploadToGitHub = async (file, userId) => {
  try {
    console.log('Iniciando upload para usuario:', userId);
    console.log('Archivo:', file.name, file.type, file.size);
    
    const base64 = await fileToBase64(file);
    const content = base64.split(',')[1];
    
    console.log('Datos a enviar:', {
      userId: userId,
      fileName: file.name,
      fileType: file.type,
      contentLength: content.length
    });
    
    const { data, error } = await supabase.functions.invoke('upload-github-image', {
      body: {
        userId: userId,
        fileName: file.name,
        fileContent: content,
        fileType: file.type
      }
    });

    console.log('Respuesta completa:', { data, error });

    if (error) {
      console.error('Error completo de Supabase:', error);
      if (error.context) {
        console.error('Contexto del error:', error.context);
      }
      throw error;
    }
    
    if (!data?.success) {
      console.error('Edge Function falló:', data);
      throw new Error(data?.error || 'Error desconocido en Edge Function');
    }

    return data.downloadUrl;
    
  } catch (error) {
    console.error('Error completo:', error);
    throw new Error(`Error uploading image: ${error.message}`);
  }
};

export const deleteGitHubImage = async (filePath) => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-github-image', {
      body: {
        filePath: filePath
      }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    return true;
    
  } catch (error) {
    throw new Error(`Error deleting image: ${error.message}`);
  }
};

export const deleteUserFolder = async (userId) => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-github-folder', {
      body: {
        userId: userId
      }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    return true;
    
  } catch (error) {
    throw new Error(`Error deleting user folder: ${error.message}`);
  }
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};