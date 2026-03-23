// Sun Zhiyuan Felix (A0272474Y)

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import CategoryProduct from "../../src/pages/CategoryProduct";
import { AuthProvider } from "../../src/context/auth";
import { CartProvider } from "../../src/context/cart";
import { SearchProvider } from "../../src/context/search";

jest.mock("axios");

const mockProducts = [
  {
    _id: "p1",
    name: "Phone X",
    slug: "phone-x",
    price: 999.5,
    description: "A flagship phone with excellent battery life and camera quality for daily use.",
  },
  {
    _id: "p2",
    name: "Wireless Earbuds",
    slug: "wireless-earbuds",
    price: 129,
    description: "Compact earbuds with active noise cancellation and clear microphone audio.",
  },
];

const mockCategory = { _id: "c1", name: "Electronics", slug: "electronics" };

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function renderWithProviders(initialPath = "/category/electronics") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <Routes>
              <Route path="/category/:slug" element={<CategoryProduct />} />
              <Route path="*" element={<LocationDisplay />} />
            </Routes>
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("CategoryProduct page", () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/product-category/electronics") {
        return Promise.resolve({
          data: {
            success: true,
            products: mockProducts,
            category: mockCategory,
          },
        });
      }

      // Layout Header uses this endpoint on mount.
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: "c1", name: "Electronics", slug: "electronics" }],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected axios.get URL: ${url}`));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders category title and result count", async () => {
    const { container } = renderWithProviders();
    const main = container.querySelector("main");
    const mainQueries = within(main);

    expect(await mainQueries.findByText("Category - Electronics")).toBeInTheDocument();
    expect(mainQueries.getByText("2 result found")).toBeInTheDocument();
  });

  test("renders product cards with text", async () => {
    const { container } = renderWithProviders();
    const main = container.querySelector("main");
    const mainQueries = within(main);

    expect(await mainQueries.findByText("Phone X")).toBeInTheDocument();
    expect(mainQueries.getByText("Wireless Earbuds")).toBeInTheDocument();
    expect(mainQueries.getByText("$999.50")).toBeInTheDocument();
    expect(mainQueries.getByText("$129.00")).toBeInTheDocument();
  });

test("renders product cards image", async () => {
    const { container } = renderWithProviders();
    const main = container.querySelector("main");
    const mainQueries = within(main);
    expect(await mainQueries.findByText("Phone X")).toBeInTheDocument();
 
    const phoneImage = mainQueries.getByRole("img", { name: "Phone X" });
    expect(phoneImage).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
    const earbudsImage = mainQueries.getByRole("img", { name: "Wireless Earbuds" });
    expect(earbudsImage).toHaveAttribute("src", "/api/v1/product/product-photo/p2");
  });

  test("renders product cards buttons", async () => {
    const { container } = renderWithProviders();
    const main = container.querySelector("main");
    const mainQueries = within(main);
    expect(await mainQueries.findByText("Phone X")).toBeInTheDocument();
 
    const detailsButtons = mainQueries.getAllByRole("button", { name: /more details/i });
    expect(detailsButtons).toHaveLength(2);
  });

  test("navigates to product details page when More Details is clicked", async () => {
    const { container } = renderWithProviders();
    const main = container.querySelector("main");
    const mainQueries = within(main);
    expect(await mainQueries.findByText("Phone X")).toBeInTheDocument();

    const detailsButtons = mainQueries.getAllByRole("button", { name: /more details/i });
    fireEvent.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent("/product/phone-x");
    });
  });

  test("calls category-product API with route slug", async () => {
    const { container } = renderWithProviders("/category/electronics");
    const main = container.querySelector("main");

    await within(main).findByText("Category - Electronics");

    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-category/electronics");
  });
});
