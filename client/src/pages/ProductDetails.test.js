// Thanakorn Pawirunsiri, A0266315E

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ProductDetails from "./ProductDetails";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// Mock axios
jest.mock("axios");

// Mock react-router-dom
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ slug: "test-product" }),
  useNavigate: () => mockNavigate,
}));

// Mock Layout
jest.mock("./../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
});

const mockProduct = {
  _id: "123",
  name: "Test Product",
  description: "This is a test product description",
  price: 100,
  category: {
    _id: "123",
    name: "Test Category",
  },
};

const mockRelatedProducts = [
  {
    _id: "456",
    name: "Another Test Product",
    description: "Similar to test product description",
    price: 200,
    slug: "another-test-product",
  },
];

it("should render product details after API call", async () => {
  axios.get
    .mockResolvedValueOnce({ data: { product: mockProduct } }) // first call
    .mockResolvedValueOnce({ data: { products: mockRelatedProducts } }); // second call

  render(
    <MemoryRouter>
      <ProductDetails />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/Name : Test Product/i)).toBeInTheDocument();
  expect(screen.getByText(/Category : Test Category/i)).toBeInTheDocument();
  expect(screen.getByText(/Product Details/i)).toBeInTheDocument();
});

it("should render related products", async () => {
  axios.get
    .mockResolvedValueOnce({ data: { product: mockProduct } })
    .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

  render(
    <MemoryRouter>
      <ProductDetails />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByText("Another Test Product")).toBeInTheDocument();
  });
});

it("should navigate when clicking More Details", async () => {
  axios.get
    .mockResolvedValueOnce({ data: { product: mockProduct } })
    .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

  render(
    <MemoryRouter>
      <ProductDetails />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByText("Another Test Product")).toBeInTheDocument();
  });

  const button = screen.getByText("More Details");
  fireEvent.click(button);

  expect(mockNavigate).toHaveBeenCalledWith("/product/another-test-product");
});

it("should call correct API endpoints", async () => {
  axios.get
    .mockResolvedValueOnce({ data: { product: mockProduct } })
    .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

  render(
    <MemoryRouter>
      <ProductDetails />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByText("Another Test Product")).toBeInTheDocument();
  });

  expect(axios.get).toHaveBeenCalledWith(
    "/api/v1/product/get-product/test-product",
  );
  expect(axios.get).toHaveBeenCalledWith(
    "/api/v1/product/related-product/123/123",
  );
});
