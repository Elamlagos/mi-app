import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const EditPlate = ({ onNavigate }) => {
  const [temas, setTemas] = useState([]);
  const [subtemas, setSubtemas] = useState([]);
  const [tinciones, setTinciones] = useState([]);

  const [selectedTema, setSelectedTema] = useState('');
  const [selectedSubtema, setSelectedSubtema] = useState('');
  const [plates, setPlates] = useState([]);

  const [editingPlate, setEditingPlate] = useState(null);
  const [formData, setFormData] = useState({
    id_visual: '',
    id_tincion: '',
    estado_placa: '',
    caja: '',
    observaciones: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const estadosPlaca = ['excelente', 'muy buena', 'buena', 'mala'];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [{ data: temasData, error: temasError }, { data: tincionesData, error: tincionesError }] = await Promise.all([
          supabase.from('temas').select('*').order('nombre'),
          supabase.from('tinciones').select('*').order('tipo').order('nombre')
        ]);
        if (temasError) throw temasError;
        if (tincionesError) throw tincionesError;
        setTemas(temasData || []);
        setTinciones(tincionesData || []);
      } catch (err) {
        setError(`Error cargando datos: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadSubtemas = async () => {
      if (!selectedTema) {
        setSubtemas([]);
        return;
      }
      const { data, error } = await supabase
        .from('subtemas')
        .select('*')
        .eq('id_tema', selectedTema)
        .order('nombre');
      if (error) {
        setError(`Error cargando subtemas: ${error.message}`);
        return;
      }
      setSubtemas(data);
    };
    loadSubtemas();
  }, [selectedTema]);

  useEffect(() => {
    const loadPlates = async () => {
      if (!selectedTema || !selectedSubtema) {
        setPlates([]);
        return;
      }
      const { data, error } = await supabase
        .from('placas')
        .select('*')
        .eq('id_tema', selectedTema)
        .eq('id_subtema', selectedSubtema)
        .order('id_visual');
      if (error) {
        setError(`Error cargando placas: ${error.message}`);
        return;
      }
      setPlates(data || []);
    };
    loadPlates();
  }, [selectedTema, selectedSubtema]);

  const handleEditClick = (plate) => {
    setEditingPlate(plate);
    setFormData({
      id_visual: plate.id_visual || '',
      id_tincion: plate.id_tincion || '',
      estado_placa: plate.estado_placa || '',
      caja: plate.caja || '',
      observaciones: plate.observaciones || ''
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingPlate) return;
    try {
      setSaving(true);
      setError('');
      const { data: { session } } = await supabase.auth.getSession();
      await supabase
        .from('placas')
        .update({
          id_tincion: formData.id_tincion || null,
          estado_placa: formData.estado_placa || null,
          caja: formData.caja ? parseInt(formData.caja) : null,
          observaciones: formData.observaciones,
          id_editor: session?.user?.id || null,
          edicion: new Date().toISOString()
        })
        .eq('id', editingPlate.id);

      alert('Placa actualizada correctamente');

      const { data } = await supabase
        .from('placas')
        .select('*')
        .eq('id_tema', selectedTema)
        .eq('id_subtema', selectedSubtema)
        .order('id_visual');
      setPlates(data || []);
      setEditingPlate(null);
    } catch (err) {
      setError(`Error actualizando placa: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Cargando datos...</div>;
  }

  return (
    <div>
      <button onClick={() => onNavigate('inventario-placas')}>← Volver al Inventario</button>
      <h2>Editar Placas</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {editingPlate ? (
        <form onSubmit={handleUpdate} style={{ marginTop: '20px' }}>
          <h4>Editar {editingPlate.id_visual}</h4>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block' }}>Tinción:</label>
            <select
              value={formData.id_tincion}
              onChange={e => setFormData({ ...formData, id_tincion: e.target.value })}
            >
              <option value="">-- Seleccionar --</option>
              {tinciones.map(t => (
                <option key={t.id_tincion} value={t.id_tincion}>
                  {t.id_tincion} - {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block' }}>Estado:</label>
            <select
              value={formData.estado_placa}
              onChange={e => setFormData({ ...formData, estado_placa: e.target.value })}
            >
              <option value="">-- Seleccionar --</option>
              {estadosPlaca.map(est => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block' }}>Caja:</label>
            <input
              type="number"
              value={formData.caja}
              onChange={e => setFormData({ ...formData, caja: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block' }}>Observaciones:</label>
            <textarea
              value={formData.observaciones}
              onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
              rows="3"
            />
          </div>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Actualizar'}
          </button>
          <button type="button" onClick={() => setEditingPlate(null)} disabled={saving} style={{ marginLeft: '10px' }}>
            Cancelar
          </button>
        </form>
      ) : (
        <div>
          <h4>Seleccionar Categoría</h4>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block' }}>Tema:</label>
            <select value={selectedTema} onChange={e => setSelectedTema(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {temas.map(tema => (
                <option key={tema.id_tema} value={tema.id_tema}>
                  {tema.id_tema} - {tema.nombre}
                </option>
              ))}
            </select>
          </div>
          {selectedTema && (
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block' }}>Subtema:</label>
              <select value={selectedSubtema} onChange={e => setSelectedSubtema(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {subtemas.map(sub => (
                  <option key={sub.id_subtema} value={sub.id_subtema}>
                    {sub.id_subtema} - {sub.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          {plates.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4>Placas ({plates.length})</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {plates.map(p => (
                  <li key={p.id} style={{ marginBottom: '10px', border: '1px solid #ddd', padding: '10px' }}>
                    <strong>{p.id_visual}</strong> - {p.estado_placa || 'sin estado'}
                    <button onClick={() => handleEditClick(p)} style={{ marginLeft: '10px' }}>
                      Editar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditPlate;
