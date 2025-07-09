import { supabase } from '../lib/supabase';
import { uploadToGitHub, deleteGitHubImage, deleteUserFolder } from '../lib/github';

export const userService = {
  // Obtener todos los usuarios
  async getAllUsers() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('creacion', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Crear nuevo usuario
  async createUser(userData, photoFile) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password
    });

    if (authError) throw authError;

    const userId = authData.user.id;
    let fotoUrl = null;

    if (photoFile) {
      fotoUrl = await uploadToGitHub(photoFile, userId);
    }

    const { error: profileError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: userId,
          email: userData.email,
          nombre: userData.nombre,
          apellidos: userData.apellidos,
          rol: userData.rol,
          comite: userData.comite,
          estado_placa: 'Sin usos',
          estado_lente: 'Sin usos',
          foto_url: fotoUrl
        }
      ]);

    if (profileError) throw profileError;
    return { userId, fotoUrl };
  },

  // Actualizar usuario (con contraseña opcional)
  async updateUser(userId, userData, newPhotoFile, newPassword) {
    let fotoUrl = userData.foto_url;

    // Manejar foto nueva
    if (newPhotoFile) {
      if (userData.foto_url) {
        try {
          const oldPath = this.extractPathFromUrl(userData.foto_url);
          await deleteGitHubImage(oldPath);
        } catch (error) {
          console.warn('No se pudo eliminar foto anterior:', error);
        }
      }
      
      fotoUrl = await uploadToGitHub(newPhotoFile, userId);
    }

    // Actualizar tabla usuarios
    const { error } = await supabase
      .from('usuarios')
      .update({
        email: userData.email,
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        rol: userData.rol,
        comite: userData.comite,
        estado_placa: userData.estado_placa,
        estado_lente: userData.estado_lente,
        foto_url: fotoUrl
      })
      .eq('id', userId);

    if (error) throw error;

    // Cambiar contraseña si se proporcionó
    if (newPassword && newPassword.trim() !== '') {
      await this.updatePassword(userId, newPassword);
    }

    return fotoUrl;
  },

  // Cambiar contraseña de usuario específico
  async updatePassword(userId, newPassword) {
    if (newPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    // Nota: Supabase requiere que el usuario esté autenticado para cambiar su propia contraseña
    // Para cambiar contraseña de otros usuarios, necesitaríamos usar Admin API
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
  },

  // Eliminar usuario (SOLO de la tabla usuarios)
  async deleteUser(userId) {
    console.log('Eliminando usuario:', userId);
    
    try {
      // Solo eliminar de nuestra tabla usuarios
      // La tabla auth.users se maneja automáticamente por Supabase
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error eliminando de tabla usuarios:', error);
        throw error;
      }

      // Intentar eliminar fotos (opcional, no crítico)
      try {
        await deleteUserFolder(userId);
      } catch (error) {
        console.warn('No se pudieron eliminar las fotos:', error);
      }

      console.log('Usuario eliminado exitosamente');
      return true;
      
    } catch (error) {
      console.error('Error en deleteUser:', error);
      throw error;
    }
  },

  // Validar datos antes de crear/actualizar
  validateUserData(userData, isUpdate = false) {
    const errors = [];

    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Email inválido');
    }

    if (!isUpdate && (!userData.password || userData.password.length < 6)) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (!userData.nombre || userData.nombre.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (!userData.apellidos || userData.apellidos.trim().length < 2) {
      errors.push('Los apellidos deben tener al menos 2 caracteres');
    }

    if (!userData.rol || !['administrador', 'instructor'].includes(userData.rol)) {
      errors.push('Rol inválido');
    }

    if (!userData.comite || !['microscopia', 'redes', 'decoracion'].includes(userData.comite)) {
      errors.push('Comité inválido');
    }

    return errors;
  },

  // Validar formato de email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Extraer path de URL de GitHub
  extractPathFromUrl(url) {
    if (!url) return null;
    const match = url.match(/\/([^/]+\/[^/]+\/[^/]+)$/);
    return match ? match[1] : null;
  }
};