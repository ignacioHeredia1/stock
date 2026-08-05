import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Product, StockMovement } from '../../types';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';

export const StockView: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    type: 'INGRESO',
    quantity: '',
    reason: ''
  });

  const loadData = () => {
    api.get<StockMovement[]>('/inventory/movements').then(setMovements).catch(() => {});
    api.get<Product[]>('/products').then(setProducts).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/movements', {
        ...formData,
        product_id: parseInt(formData.product_id),
        quantity: parseFloat(formData.quantity) || 1
      });
      setIsModalOpen(false);
      setFormData({ product_id: '', type: 'INGRESO', quantity: '', reason: '' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar movimiento');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass" style={{ padding: '16px 24px', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Historial de Movimientos de Stock</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registro de entradas, salidas manuales y pérdidas/roturas</span>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <ArrowLeftRight size={18} /> Registrar Movimiento
        </button>
      </div>

      <div className="glass table-responsive" style={{ borderRadius: 'var(--radius-lg)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '14px 20px' }}>Fecha y Hora</th>
              <th style={{ padding: '14px 20px' }}>Producto</th>
              <th style={{ padding: '14px 20px' }}>Tipo Movimiento</th>
              <th style={{ padding: '14px 20px' }}>Cantidad</th>
              <th style={{ padding: '14px 20px' }}>Observaciones / Motivo</th>
              <th style={{ padding: '14px 20px' }}>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay movimientos de stock registrados</td></tr>
            ) : (
              movements.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleString('es-AR')}</td>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>{m.product_name}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`badge ${m.type === 'INGRESO' || (m.type as string) === 'COMPRA' ? 'badge-success' : m.type === 'PERDIDA_ROTURA' ? 'badge-danger' : 'badge-warning'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 800 }}>{m.quantity} u.</td>
                  <td style={{ padding: '14px 20px' }}>{m.reason || '-'}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{m.user_name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Movimiento Manual de Stock">
        <form onSubmit={handleSaveMovement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Seleccionar Producto *</label>
            <select required className="input-field" value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}>
              <option value="">Seleccionar Producto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock Actual: {p.current_stock})</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tipo de Movimiento</label>
              <select className="input-field" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="INGRESO">Ingreso (+) (Mercadería recibida)</option>
                <option value="SALIDA">Salida (-) (Consumo interno)</option>
                <option value="PERDIDA_ROTURA">Pérdida o Rotura (-) (Producto dañado/vencido)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cantidad (Unidades)</label>
              <input required type="number" step="0.01" className="input-field" placeholder="Ej: 10" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Motivo / Observaciones</label>
            <input type="text" className="input-field" placeholder="Ej: Paquete roto al descargar, vencimiento de golosina" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Registrar Movimiento</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
