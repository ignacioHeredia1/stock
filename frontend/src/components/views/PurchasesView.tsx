import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Purchase, Product } from '../../types';
import { ShoppingBag, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';

export const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<Array<{ product_id: number; product_name: string; unit_cost: number; quantity: number }>>([]);
  
  const [newProductId, setNewProductId] = useState<string>('');
  const [newQty, setNewQty] = useState<string>('');
  const [newCost, setNewCost] = useState<string>('');

  const loadData = () => {
    api.get<Purchase[]>('/purchases').then(setPurchases).catch(() => {});
    api.get<Product[]>('/products').then(setProducts).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCartItem = () => {
    if (!newProductId) return;
    const prod = products.find(p => p.id === parseInt(newProductId));
    if (!prod) return;

    const qty = Math.max(1, parseFloat(newQty) || 1);
    const parsedCost = parseFloat(newCost);
    const cost = !isNaN(parsedCost) && parsedCost >= 0 ? parsedCost : prod.cost_price;

    setCartItems(prev => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.name,
        unit_cost: cost,
        quantity: qty
      }
    ]);

    setNewProductId('');
    setNewQty('');
    setNewCost('');
  };

  const handleRemoveCartItem = (idx: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('Agregue al menos un producto a la reposición');
      return;
    }

    try {
      await api.post('/purchases', {
        items: cartItems.map(i => ({
          product_id: i.product_id,
          unit_cost: i.unit_cost,
          quantity: i.quantity
        }))
      });

      setIsModalOpen(false);
      setCartItems([]);
      loadData();
      alert('¡Compra registrada exitosamente! El stock de los productos se ha actualizado automáticamente.');
    } catch (err: any) {
      alert(err.message || 'Error al registrar compra');
    }
  };

  const totalPurchase = cartItems.reduce((acc, i) => acc + (i.unit_cost * i.quantity), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass" style={{ padding: '16px 24px', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Registro de Compras y Reposición de Stock</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Al guardar un ingreso de mercadería, el inventario se incrementa de forma automática</span>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Registrar Nueva Reposición
        </button>
      </div>

      {/* Purchases History */}
      <div className="glass table-responsive" style={{ borderRadius: 'var(--radius-lg)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '14px 20px' }}>Fecha</th>
              <th style={{ padding: '14px 20px' }}>Detalle de Productos</th>
              <th style={{ padding: '14px 20px' }}>Registrado Por</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Total de Compra ($)</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay reposiciones de stock registradas</td></tr>
            ) : (
              purchases.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleString('es-AR')}</td>
                  <td style={{ padding: '14px 20px' }}>
                    {p.items.map(item => (
                      <div key={item.id} style={{ fontSize: '0.82rem' }}>
                        • {item.product_name} ({item.quantity} u. x ${item.unit_cost})
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{p.user_name}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-success)', fontSize: '1.05rem' }}>
                    ${p.total_amount.toLocaleString('es-AR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NEW PURCHASE MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Reposición de Mercadería" maxWidth="600px">
        <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add product section */}
          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Agregar Productos Comprados</span>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
              <select className="input-field" value={newProductId} onChange={(e) => {
                setNewProductId(e.target.value);
                const p = products.find(prod => prod.id === parseInt(e.target.value));
                if (p && p.cost_price > 0) {
                  setNewCost(String(p.cost_price));
                } else {
                  setNewCost('');
                }
              }}>
                <option value="">Producto...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>)}
              </select>

              <input type="number" className="input-field" placeholder="Cant." value={newQty} onChange={(e) => setNewQty(e.target.value)} />
              <input type="number" step="0.01" className="input-field" placeholder="Costo $" value={newCost} onChange={(e) => setNewCost(e.target.value)} />

              <button type="button" onClick={handleAddCartItem} className="btn btn-primary" style={{ padding: '8px 12px' }}>
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* List of items in purchase */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cartItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span><strong>{item.product_name}</strong> - {item.quantity} u. x ${item.unit_cost}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong>${item.quantity * item.unit_cost}</strong>
                  <button type="button" onClick={() => handleRemoveCartItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Total Compra: ${totalPurchase.toLocaleString('es-AR')}</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-success"><CheckCircle2 size={18} /> Guardar Compra e Incrementar Stock</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
