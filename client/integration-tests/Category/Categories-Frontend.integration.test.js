// Sun Zhiyuan Felix (A0272474Y)

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Categories from "../../src/pages/Categories";
import { AuthProvider } from "../../src/context/auth";
import { CartProvider } from "../../src/context/cart";
import { SearchProvider } from "../../src/context/search";

jest.mock("axios");

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>{ui}</SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

test("renders categories with real Layout/Header/Footer", async () => {
  axios.get.mockResolvedValue({
    data: {
      success: true,
      category: [
        { _id: "1", name: "Category 1", slug: "category-1" },
        { _id: "2", name: "Category 2", slug: "category-2" },
      ],
    },
  });

  const { container } = renderWithProviders(<Categories />);

  // Scope assertions to page main content because Header also renders category links.
  const main = container.querySelector("main");
  const mainQueries = within(main);

  expect(await mainQueries.findByRole("link", { name: "Category 1" })).toHaveAttribute("href", "/category/category-1");
  expect(mainQueries.getByRole("link", { name: "Category 2" })).toHaveAttribute("href", "/category/category-2");

  const pageLinks = mainQueries.getAllByRole("link", { name: /Category/i });
  expect(pageLinks.length).toBe(2);
});