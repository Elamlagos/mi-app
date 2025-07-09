import { useState, useEffect } from 'react';
import { userService } from '../services/userService';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(`Error cargando usuarios: ${err.message}`);
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData, photoFile) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validar datos antes de enviar
      const validationErrors = userService.validateUserData(userData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await userService.createUser(userData, photoFile);
      await loadUsers(); // Recargar lista
      return { success: true, message: 'Usuario registrado exitosamente' };
    } catch (err) {
      const errorMessage = `Error creando usuario: ${err.message}`;
      setError(errorMessage);
      console.error('Error creating user:', err);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, userData, newPhotoFile, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validar datos antes de enviar
      const validationErrors = userService.validateUserData(userData, true);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await userService.updateUser(userId, userData, newPhotoFile, newPassword);
      await loadUsers(); // Recargar lista
      return { success: true, message: 'Usuario actualizado exitosamente' };
    } catch (err) {
      const errorMessage = `Error actualizando usuario: ${err.message}`;
      setError(errorMessage);
      console.error('Error updating user:', err);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userId) {
        throw new Error('ID de usuario requerido');
      }

      await userService.deleteUser(userId);
      await loadUsers(); // Recargar lista
      return { success: true, message: 'Usuario eliminado exitosamente' };
    } catch (err) {
      const errorMessage = `Error eliminando usuario: ${err.message}`;
      setError(errorMessage);
      console.error('Error deleting user:', err);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    loading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    clearError
  };
};