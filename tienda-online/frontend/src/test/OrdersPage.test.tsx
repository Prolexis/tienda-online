import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import OrdersPage from '../pages/OrdersPage';
import api from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockOrders = [
  {
    id: 1,
    numeroOrden: 'ORD-123',
    estado: 'ENTREGADA',
    total: 150.50,
    createdAt: '2026-04-26T12:00:00Z',
    metodoPago: 'tarjeta',
    items: [
      {
        id: 101,
        nombreProducto: 'Producto de Prueba',
        cantidad: 2,
        precioUnitario: 75.25,
        subtotal: 150.50,
      },
    ],
  },
];

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.get as any).mockReturnValue(new Promise(() => {})); // Never resolves
    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renders orders after loading', async () => {
    (api.get as any).mockResolvedValue({ data: { ordenes: mockOrders } });
    
    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(await screen.findByText(/ORD-123/)).toBeInTheDocument();
    expect(await screen.findByText(/Producto de Prueba/)).toBeInTheDocument();
    const prices = await screen.findAllByText(/150\.50/);
    expect(prices.length).toBeGreaterThan(0);
  });

  it('renders empty state when no orders', async () => {
    (api.get as any).mockResolvedValue({ data: { ordenes: [] } });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(await screen.findByText('Aún no tienes pedidos')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (api.get as any).mockRejectedValue(new Error('API Error'));

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(await screen.findByText('Aún no tienes pedidos')).toBeInTheDocument();
  });
});
