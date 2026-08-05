import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Product, Category } from '../../types';
import { Search, Plus, Minus, Edit2, Trash2, AlertCircle, ArrowUpDown, LayoutGrid, Table } from 'lucide-react';
import { Modal } from '../ui/Modal';

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [sortByStock, setSortByStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => window.innerWidth <= 768 ? 'cards' : 'table');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    cost_price: '',
    sale_price: '',
    current_stock: '',
    min_stock: '',
    notes: ''
  });

  const loadProducts = () => {
    setLoading(true);
    let url = `/products?search=${encodeURIComponent(search)}`;
    if (selectedCategory) url += `&category_id=${selectedCategory}`;
    if (lowStockFilter) url += `&low_stock_only=true`;
    if (sortByStock) url += `&sort_by_stock=true`;

    api.get<Product[]>(url)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [search, selectedCategory, lowStockFilter, sortByStock]);

  useEffect(() => {
    api.get<Category[]>('/products/categories/list').then(setCategories).catch(() => {});
  }, []);

  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isModalOpen && formData.name.trim().length >= 3) {
      const timer = setTimeout(() => {
        api.get<Product[]>(`/products?search=${encodeURIComponent(formData.name.trim())}`)
          .then(res => {
            const filtered = res.filter(p => p.id !== editingProduct?.id);
            setSimilarProducts(filtered);
          })
          .catch(() => {});
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setSimilarProducts([]);
      return undefined;
    }
  }, [formData.name, isModalOpen, editingProduct]);

  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>('');

  const handleStartStockEdit = (prod: Product) => {
    setEditingStockId(prod.id);
    setEditingStockValue(String(prod.current_stock));
  };

  const handleSaveInlineStock = async (prod: Product) => {
    const targetStock = Math.max(0, parseFloat(editingStockValue) || 0);
    setEditingStockId(null);
    if (targetStock === prod.current_stock) return;

    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, current_stock: targetStock } : p));

    try {
      await api.put(`/products/${prod.id}`, { current_stock: targetStock });
    } catch (err) {
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, current_stock: prod.current_stock } : p));
    }
  };

  const handleAdjustStock = async (prod: Product, delta: number) => {
    const newStock = Math.max(0, prod.current_stock + delta);
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, current_stock: newStock } : p));

    try {
      await api.put(`/products/${prod.id}`, { current_stock: newStock });
    } catch (err) {
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, current_stock: prod.current_stock } : p));
    }
  };

  const handleOpenModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        name: prod.name,
        category_id: prod.category_id ? String(prod.category_id) : '',
        cost_price: String(prod.cost_price),
        sale_price: String(prod.sale_price),
        current_stock: String(prod.current_stock),
        min_stock: String(prod.min_stock),
        notes: prod.notes || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: categories.length > 0 ? String(categories[0].id) : '',
        cost_price: '',
        sale_price: '',
        current_stock: '',
        min_stock: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        cost_price: parseFloat(String(formData.cost_price)) || 0,
        sale_price: parseFloat(String(formData.sale_price)) || 0,
        current_stock: parseFloat(String(formData.current_stock)) || 0,
        min_stock: parseFloat(String(formData.min_stock)) || 0,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el producto');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este producto del inventario?')) {
      await api.delete(`/products/${id}`);
      loadProducts();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter & Search Bar */}
      <div className="glass filter-bar">
        <div className="filter-group">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar producto por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <select
            className="input-field"
            style={{ width: '180px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas las Categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="filter-actions">
          <button
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            className="btn btn-secondary"
            title="Cambiar Modo de Vista (Tarjetas / Tabla)"
          >
            {viewMode === 'cards' ? <Table size={18} /> : <LayoutGrid size={18} />}
            <span>{viewMode === 'cards' ? 'Ver Tabla' : 'Ver Tarjetas'}</span>
          </button>

          <button
            onClick={() => setSortByStock(!sortByStock)}
            className={`btn ${sortByStock ? 'btn-primary' : 'btn-secondary'}`}
            title="Ordenar por menor stock"
          >
            <ArrowUpDown size={18} /> Ordenar por Stock
          </button>

          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`btn ${lowStockFilter ? 'btn-danger' : 'btn-secondary'}`}
          >
            <AlertCircle size={18} /> Ver Bajo Stock
          </button>

          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <Plus size={18} /> Agregar Producto
          </button>
        </div>
      </div>

      {/* PRODUCTS DISPLAY MODE: CARDS VS TABLE */}
      {loading ? (
        <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: 'var(--radius-lg)' }}>
          Cargando catálogo de productos...
        </div>
      ) : products.length === 0 ? (
        <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: 'var(--radius-lg)' }}>
          No se encontraron productos registrados
        </div>
      ) : viewMode === 'cards' ? (
        /* FAST MOBILE CARDS VIEW WITH DIRECT +/- AND INLINE EDITABLE QUANTITY */
        <div className="product-cards-grid">
          {products.map(p => (
            <div key={p.id} className="glass product-card-mobile">
              <div className="product-card-header">
                <div>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{p.category_name || 'General'}</span>
                  <h4 className="product-title">{p.name}</h4>
                  {p.notes && <div className="product-notes">{p.notes}</div>}
                </div>
                <div className="product-price">${p.sale_price.toLocaleString('es-AR')}</div>
              </div>

              <div className="product-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="stock-control-bar">
                  <span className="stock-label">Stock actual:</span>
                  <div className="stock-stepper">
                    <button
                      onClick={() => handleAdjustStock(p, -1)}
                      className="btn-stepper btn-minus"
                      title="Descontar 1 unidad"
                    >
                      <Minus size={18} />
                    </button>

                    {editingStockId === p.id ? (
                      <input
                        type="number"
                        step="1"
                        className="input-field"
                        style={{
                          width: '72px',
                          padding: '4px 6px',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        value={editingStockValue}
                        onChange={(e) => setEditingStockValue(e.target.value)}
                        onBlur={() => handleSaveInlineStock(p)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineStock(p);
                          if (e.key === 'Escape') setEditingStockId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => handleStartStockEdit(p)}
                        className={`stock-badge ${p.current_stock <= 0 ? 'stock-danger' : p.current_stock <= p.min_stock ? 'stock-warning' : 'stock-success'}`}
                        style={{ cursor: 'pointer' }}
                        title="Toca para escribir una cantidad exacta"
                      >
                        {p.current_stock} u.
                      </span>
                    )}

                    <button
                      onClick={() => handleAdjustStock(p, 1)}
                      className="btn-stepper btn-plus"
                      title="Sumar 1 unidad"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="quick-adjust-chips">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>Rápido:</span>
                  <button onClick={() => handleAdjustStock(p, 10)} className="chip-btn">+10</button>
                  <button onClick={() => handleAdjustStock(p, 5)} className="chip-btn">+5</button>
                  <button onClick={() => handleAdjustStock(p, -5)} className="chip-btn chip-danger">-5</button>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleOpenModal(p)} className="icon-action-btn" title="Editar detalles"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="icon-action-btn danger" title="Eliminar"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* DESKTOP DATATABLE VIEW */
        <div className="glass table-responsive" style={{ borderRadius: 'var(--radius-lg)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '14px 20px' }}>Nombre Producto</th>
                <th style={{ padding: '14px 20px' }}>Categoría</th>
                <th style={{ padding: '14px 20px' }}>Precio Compra ($)</th>
                <th style={{ padding: '14px 20px' }}>Precio Venta ($)</th>
                <th style={{ padding: '14px 20px' }}>Cantidad Stock</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>
                    {p.name}
                    {p.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{p.notes}</div>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>{p.category_name || '-'}</td>
                  <td style={{ padding: '14px 20px' }}>${p.cost_price.toLocaleString('es-AR')}</td>
                  <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--accent-success)' }}>${p.sale_price.toLocaleString('es-AR')}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => handleAdjustStock(p, -1)} className="btn-stepper btn-minus" style={{ width: '28px', height: '28px' }}><Minus size={14} /></button>
                      
                      {editingStockId === p.id ? (
                        <input
                          type="number"
                          step="1"
                          className="input-field"
                          style={{
                            width: '65px',
                            padding: '2px 4px',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem'
                          }}
                          value={editingStockValue}
                          onChange={(e) => setEditingStockValue(e.target.value)}
                          onBlur={() => handleSaveInlineStock(p)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineStock(p);
                            if (e.key === 'Escape') setEditingStockId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => handleStartStockEdit(p)}
                          className={`badge ${p.current_stock <= 0 ? 'badge-danger' : p.current_stock <= p.min_stock ? 'badge-warning' : 'badge-success'}`}
                          style={{ cursor: 'pointer' }}
                          title="Toca para escribir cantidad"
                        >
                          {p.current_stock} u.
                        </span>
                      )}

                      <button onClick={() => handleAdjustStock(p, 1)} className="btn-stepper btn-plus" style={{ width: '28px', height: '28px' }}><Plus size={14} /></button>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleOpenModal(p)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }} title="Editar"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteProduct(p.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }} title="Eliminar"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'} maxWidth="560px">
        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre del Producto *</label>
            <input required type="text" className="input-field" placeholder="Ej: Coca-Cola 500ml, Alfajor Guaymallén" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            
            {similarProducts.length > 0 && (
              <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--accent-warning)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-warning)', fontSize: '0.85rem' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>⚠️ Atención: Ya existen productos similares</strong>
                Revisa para evitar duplicados:
                <ul style={{ margin: '4px 0 0 24px', padding: 0 }}>
                  {similarProducts.slice(0, 3).map(p => (
                    <li key={p.id}><strong>{p.name}</strong> (Stock: {p.current_stock} u.)</li>
                  ))}
                  {similarProducts.length > 3 && <li>... y {similarProducts.length - 3} más.</li>}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Categoría</label>
            <select className="input-field" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
              <option value="">Seleccionar Categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio de Compra (Costo $)</label>
              <input type="number" step="0.01" className="input-field" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-success)' }}>Precio de Venta ($)</label>
              <input type="number" step="0.01" className="input-field" style={{ fontWeight: 800 }} value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cantidad Actual en Stock</label>
              <input type="number" className="input-field" value={formData.current_stock} onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Stock Mínimo (Aviso Reponer)</label>
              <input type="number" className="input-field" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Observaciones</label>
            <input type="text" className="input-field" placeholder="Ej: Pedir los martes, caja por 24 u." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar Producto</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
