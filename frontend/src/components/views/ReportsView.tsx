import React from 'react';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const downloadReport = (endpoint: string, filename: string) => {
    const token = localStorage.getItem('access_token');
    fetch(`/api/v1/reports/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Error al descargar el reporte'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem' }}>Generación y Exportación de Reportes</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Exporte las planillas y registros del inventario del kiosco en formato Excel (.xlsx) o PDF listo para imprimir en 1 solo clic.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {/* Stock Report Card */}
        <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reporte de Inventario Actual</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Excel (.xlsx) y PDF (.pdf)</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Listado completo de productos con stock actual, precios de compra (costo), precio venta, valor del dinero invertido y alertas de faltantes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => downloadReport('stock/excel', 'reporte_inventario_kiosco.xlsx')} className="btn btn-primary" style={{ flex: 1 }}>
              <Download size={16} /> Excel (.xlsx)
            </button>
            <button onClick={() => downloadReport('stock/pdf', 'reporte_inventario_kiosco.pdf')} className="btn btn-secondary" style={{ flex: 1 }}>
              <FileText size={16} /> PDF (.pdf)
            </button>
          </div>
        </div>

        {/* Purchases Report Card */}
        <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reporte de Compras Realizadas</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Excel (.xlsx) y PDF (.pdf)</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Historial de compras registradas a proveedores con fecha, proveedor y total de dinero pagado.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => downloadReport('purchases/excel', 'reporte_compras_kiosco.xlsx')} className="btn btn-success" style={{ flex: 1 }}>
              <Download size={16} /> Excel (.xlsx)
            </button>
            <button onClick={() => downloadReport('purchases/pdf', 'reporte_compras_kiosco.pdf')} className="btn btn-secondary" style={{ flex: 1 }}>
              <FileText size={16} /> PDF (.pdf)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
