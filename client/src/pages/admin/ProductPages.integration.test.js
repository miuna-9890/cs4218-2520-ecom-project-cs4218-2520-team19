import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

import CreateProduct from './CreateProduct';
import UpdateProduct from './UpdateProduct';
import ProductDetails from '../ProductDetails';
import CategoryProduct from '../CategoryProduct';

// Mocks
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('./../../components/Layout', () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock('./../../components/AdminMenu', () => () => (
  <div data-testid="admin-menu" />
));
jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));

jest.mock('antd', () => {
  const MockSelect = ({ onChange, placeholder, children, value }) => (
    <select
      data-testid={placeholder}
      onChange={(e) => onChange(e.target.value)}
      value={value || ''}
    >
      {children}
    </select>
  );
  MockSelect.Option = ({ value, children }) => (
    <option value={value}>{children}</option>
  );
  return { Select: MockSelect };
});

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ slug: 'test-product' }),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockCategory = {
  _id: 'cat123',
  name: 'Electronics',
  slug: 'electronics',
};

const mockProduct = {
  _id: 'prod123',
  name: 'Test Laptop',
  slug: 'test-laptop',
  description: 'A powerful test laptop',
  price: 1500,
  quantity: 10,
  shipping: true,
  category: mockCategory,
};

const mockUpdatedProduct = {
  ...mockProduct,
  name: 'Updated Laptop',
  price: 1200,
};

const mockRelatedProduct = {
  _id: 'prod456',
  name: 'Related Monitor',
  slug: 'related-monitor',
  description: 'A high resolution monitor',
  price: 800,
  category: mockCategory,
};

// Helpers
const renderWithRouter = (ui, { path = '/', route = '/' } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>,
  );

// Tests
describe('Product Pages Frontend Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a product and have it rendered correctly in ProductDetails', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [mockCategory] },
    });
    axios.post.mockResolvedValueOnce({
      data: { success: true, products: mockProduct },
    });
    const { unmount } = renderWithRouter(<CreateProduct />, {
      path: '/dashboard/admin/create-product',
      route: '/dashboard/admin/create-product',
    });
    await waitFor(() =>
      expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByPlaceholderText('write a name'), {
      target: { value: 'Test Laptop' },
    });
    fireEvent.change(screen.getByPlaceholderText('write a description'), {
      target: { value: 'A powerful test laptop' },
    });
    fireEvent.change(screen.getByPlaceholderText('write a Price'), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByPlaceholderText('write a quantity'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByTestId('Select a category'), {
      target: { value: 'cat123' },
    });
    fireEvent.click(screen.getByText('CREATE PRODUCT'));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/create-product',
        expect.any(FormData),
      );
      expect(toast.success).toHaveBeenCalledWith(
        'Product Created Successfully',
      );
    });
    unmount();
    axios.get
      .mockResolvedValueOnce({ data: { product: mockProduct } })
      .mockResolvedValueOnce({ data: { products: [mockRelatedProduct] } });
    renderWithRouter(<ProductDetails />, {
      path: '/product/:slug',
      route: '/product/test-laptop',
    });
    await waitFor(() => {
      expect(screen.getByText('Name : Test Laptop')).toBeInTheDocument();
      expect(
        screen.getByText('Description : A powerful test laptop'),
      ).toBeInTheDocument();
      expect(screen.getByText(/\$1,500\.00/)).toBeInTheDocument();
      expect(screen.getByText('Category : Electronics')).toBeInTheDocument();
    });
    expect(screen.getByText('Related Monitor')).toBeInTheDocument();
  });

  it('should create a product and have it appear in CategoryProduct listing', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [mockCategory] },
    });
    axios.post.mockResolvedValueOnce({
      data: { success: true, products: mockProduct },
    });

    const { unmount } = renderWithRouter(<CreateProduct />, {
      path: '/dashboard/admin/create-product',
      route: '/dashboard/admin/create-product',
    });

    await waitFor(() =>
      expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText('write a name'), {
      target: { value: 'Test Laptop' },
    });
    fireEvent.change(screen.getByPlaceholderText('write a description'), {
      target: { value: 'A powerful test laptop' },
    });
    fireEvent.change(screen.getByPlaceholderText('write a Price'), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByPlaceholderText('write a quantity'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByTestId('Select a category'), {
      target: { value: 'cat123' },
    });

    fireEvent.click(screen.getByText('CREATE PRODUCT'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/create-product',
        expect.any(FormData),
      );
    });

    unmount();

    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct], category: mockCategory },
    });

    renderWithRouter(<CategoryProduct />, {
      path: '/category/:slug',
      route: '/category/electronics',
    });

    await waitFor(() => {
      expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
      expect(screen.getByText('1 result found')).toBeInTheDocument();
      expect(screen.getByText('Test Laptop')).toBeInTheDocument();
      expect(screen.getByText(/\$1,500\.00/)).toBeInTheDocument();
    });
  });

  it('should update a product and have the updated fields rendered in ProductDetails', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { product: mockProduct } })
      .mockResolvedValueOnce({
        data: { success: true, category: [mockCategory] },
      });
    axios.put.mockResolvedValueOnce({
      data: { success: true, products: mockUpdatedProduct },
    });

    const { unmount } = renderWithRouter(<UpdateProduct />, {
      path: '/dashboard/admin/product/:slug',
      route: '/dashboard/admin/product/test-laptop',
    });

    await waitFor(() =>
      expect(screen.getByDisplayValue('Test Laptop')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByDisplayValue('Test Laptop'), {
      target: { value: 'Updated Laptop' },
    });
    fireEvent.change(screen.getByDisplayValue('1500'), {
      target: { value: '1200' },
    });

    fireEvent.click(screen.getByText('UPDATE PRODUCT'));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `/api/v1/product/update-product/${mockProduct._id}`,
        expect.any(FormData),
      );
      expect(toast.success).toHaveBeenCalledWith(
        'Product Updated Successfully',
      );
    });

    unmount();

    axios.get
      .mockResolvedValueOnce({ data: { product: mockUpdatedProduct } })
      .mockResolvedValueOnce({ data: { products: [] } });

    renderWithRouter(<ProductDetails />, {
      path: '/product/:slug',
      route: '/product/updated-laptop',
    });

    await waitFor(() => {
      expect(screen.getByText('Name : Updated Laptop')).toBeInTheDocument();
      expect(screen.getByText(/\$1,200\.00/)).toBeInTheDocument();
    });
  });

  it('should delete a product from UpdateProduct and have it absent in CategoryProduct', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { product: mockProduct } })
      .mockResolvedValueOnce({
        data: { success: true, category: [mockCategory] },
      });
    axios.delete.mockResolvedValueOnce({
      data: { success: true },
    });

    window.prompt = jest.fn().mockReturnValue('yes');

    const { unmount } = renderWithRouter(<UpdateProduct />, {
      path: '/dashboard/admin/product/:slug',
      route: '/dashboard/admin/product/test-laptop',
    });

    await waitFor(() =>
      expect(screen.getByDisplayValue('Test Laptop')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('DELETE PRODUCT'));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        `/api/v1/product/delete-product/${mockProduct._id}`,
      );
      expect(toast.success).toHaveBeenCalledWith(
        'Product Deleted Successfully',
      );
    });

    unmount();

    axios.get.mockResolvedValueOnce({
      data: { products: [], category: mockCategory },
    });

    renderWithRouter(<CategoryProduct />, {
      path: '/category/:slug',
      route: '/category/electronics',
    });

    await waitFor(() => {
      expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
      expect(screen.getByText('0 result found')).toBeInTheDocument();
      expect(screen.queryByText('Test Laptop')).not.toBeInTheDocument();
    });
  });
});
