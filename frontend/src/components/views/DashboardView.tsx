import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { DashboardSummary } from '../../types';
import { StatCard } from '../ui/StatCard';
import { Package, AlertTriangle, AlertCircle, DollarSign, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Product } from '../../types';

interface DashboardViewProps {
  onNavigateToPurchases?: () => void;
  onNavigateToProducts?: (filter?: 'low_stock' | 'out_of_stock' | 'all') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToPurchases, onNavigateToProducts }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal dialog state for KPI cards
  const [activeModalFilter, setActiveModalFilter] = useState<'low_stock' | 'out_of_stock' | 'all' | null>(null);
  const [modalProducts, setModalProducts] = useState<Product[]>([]);
  const [loadingModalProds, setLoadingModalProds] = useState(false);

  const loadSummary = () => {
    setLoading(true);
    setError(null);
    api.get<DashboardSummary>('/dashboard/summary')
      .then(setSummary)
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Error al cargar los datos del dashboard');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleOpenCardModal = (filter: 'low_stock' | 'out_of_stock' | 'all') => {
    setActiveModalFilter(filter);
    setLoadingModalProds(true);
    let url = '/products';
    if (filter === 'low_stock') url += '?low_stock_only=true';
    if (filter === 'out_of_stock') url += '?out_of_stock_only=true';

    api.get<Product[]>(url)
      .then(setModalProducts)
      .catch(console.error)
      .finally(() => setLoadingModalProds(false));
  };

  const handleAdjustModalProductStock = async (prod: Product, delta: number) => {
    const newStock = Math.max(0, prod.current_stock + delta);
    setModalProducts(prev => prev.map(p => p.id === prod.id ? { ...p, current_stock: newStock } : p));

    try {
      await api.put(`/products/${prod.id}`, { current_stock: newStock });
      loadSummary(); // Refresh summary metrics in background
    } catch (err) {
      setModalProducts(prev => prev.map(p => p.id === prod.id ? { ...p, current_stock: prod.current_stock } : p));
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando resumen de inventario...</div>;
  }

  if (error || !summary) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-danger)' }}>
        <h3>⚠️ Ocurrió un error al cargar el Dashboard</h3>
        <p style={{ color: 'var(--text-muted)' }}>{error || 'No se pudieron recuperar los datos del servidor'}</p>
        <button onClick={loadSummary} className="btn btn-primary" style={{ marginTop: '12px' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 4 Main KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <StatCard
          title="Total de Productos"
          value={summary.total_products_count}
          subtitle="Toca para ver catálogo"
          icon={Package}
          color="var(--accent-primary)"
          onClick={() => handleOpenCardModal('all')}
        />
        <StatCard
          title="Valor Total Invertido ($)"
          value={`$${summary.total_inventory_value.toLocaleString('es-AR')}`}
          subtitle="Dinero total en mercadería"
          icon={DollarSign}
          color="var(--accent-success)"
        />
        <StatCard
          title="Productos con Stock Bajo"
          value={summary.low_stock_count}
          subtitle="Toca para ver cuáles reponer"
          icon={AlertTriangle}
          color="var(--accent-warning)"
          badge={summary.low_stock_count > 0 ? 'Reponer' : undefined}
          onClick={() => handleOpenCardModal('low_stock')}
        />
        <StatCard
          title="Productos Agotados"
          value={summary.out_of_stock_count}
          subtitle="Toca para ver sin stock"
          icon={AlertCircle}
          color="var(--accent-danger)"
          badge={summary.out_of_stock_count > 0 ? 'Sin Stock' : undefined}
          onClick={() => handleOpenCardModal('out_of_stock')}
        />
      </div>

      {/* Restock Alert Table (Productos Próximos a Reponer) */}
      <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>⚠️ Productos que Debe Volver a Comprar</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Productos con stock igual o menor al mínimo asignado</span>
          </div>
          {onNavigateToPurchases && (
            <button onClick={onNavigateToPurchases} className="btn btn-primary">
              <ShoppingBag size={18} /> Registrar Reposición de Mercadería
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Producto</th>
                <th style={{ padding: '12px 16px' }}>Categoría</th>
                <th style={{ padding: '12px 16px' }}>Stock Actual</th>
                <th style={{ padding: '12px 16px' }}>Stock Mínimo</th>
                <th style={{ padding: '12px 16px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {summary.restock_alert_products.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-success)', fontWeight: 700 }}>
                    ¡Excelente! No hay productos con stock bajo en este momento.
                  </td>
                </tr>
              ) : (
                summary.restock_alert_products.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '12px 16px' }}>{p.category_name}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800 }}>{p.current_stock} u.</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{p.min_stock} u.</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${p.is_out_of_stock ? 'badge-danger' : 'badge-warning'}`}>
                        {p.is_out_of_stock ? 'AGOTADO' : 'STOCK BAJO'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Products List */}
      <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', color: 'var(--text-primary)' }}>Últimos Productos Registrados</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {summary.recent_products.map(p => (
            <div key={p.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
              <span className="badge badge-info" style={{ marginBottom: '6px' }}>{p.category_name}</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '8px' }}>{p.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Precio Costo:</span>
                <strong>${p.cost_price}</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span>Stock Actual:</span>
                <strong style={{ color: p.current_stock > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{p.current_stock} u.</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI CARD DETAIL MODAL */}
      <Modal
        isOpen={activeModalFilter !== null}
        onClose={() => setActiveModalFilter(null)}
        title={
          activeModalFilter === 'low_stock'
            ? '⚠️ Productos con Stock Bajo'
            : activeModalFilter === 'out_of_stock'
            ? '❌ Productos Agotados'
            : '📦 Todos los Productos'
        }
        maxWidth="600px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loadingModalProds ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando productos...</div>
          ) : modalProducts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-success)', fontWeight: 700 }}>
              ¡No hay productos en esta categoría!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
              {modalProducts.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{p.category_name || 'General'}</span>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Precio Venta: ${p.sale_price}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleAdjustModalProductStock(p, -1)}
                      className="btn-stepper btn-minus"
                      style={{ width: '32px', height: '32px' }}
                      title="Descontar 1 unidad"
                    >
                      <Minus size={16} />
                    </button>

                    <span className={`stock-badge ${p.current_stock <= 0 ? 'stock-danger' : p.current_stock <= p.min_stock ? 'stock-warning' : 'stock-success'}`} style={{ fontSize: '0.9rem', padding: '4px 8px' }}>
                      {p.current_stock} u.
                    </span>

                    <button
                      onClick={() => handleAdjustModalProductStock(p, 1)}
                      className="btn-stepper btn-plus"
                      style={{ width: '32px', height: '32px' }}
                      title="Sumar 1 unidad"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <button onClick={() => setActiveModalFilter(null)} className="btn btn-secondary">Cerrar</button>
            {onNavigateToProducts && (
              <button
                onClick={() => {
                  const filter = activeModalFilter || undefined;
                  setActiveModalFilter(null);
                  onNavigateToProducts(filter);
                }}
                className="btn btn-primary"
              >
                Ver en Catálogo Completo <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
