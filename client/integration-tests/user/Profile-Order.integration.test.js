// Varatharaju Mithuna, A0281223N

import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import {render, screen, fireEvent, waitFor, within, act} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../../src/pages/user/Profile';
import Orders from '../../src/pages/user/Orders';
import { AuthProvider } from '../../src/context/auth';
import axios from 'axios';

jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../src/context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../src/context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

jest.mock('../../src/hooks/useCategory', () => () => []);

jest.mock('../../src/components/UserMenu', () => () => <div>UserMenu</div>);

const mockUser = {
    name: "John Doe",
    email: "John@gmail.com",
    phone: "1234567890",
    address: "123 Street",
};

const updatedUser = {
    name: "Jane Doe",
    phone: "0987654321",
    address: "456 Avenue",
    password: "newpassword123",
};

const sampleOrders = [
    {
        _id: 'order1',
        products: [
            {_id: 'prod_1', name: "Product 1", description: "Description 1", price: 100},
        ],
        payment: {success: true},
        buyer: {name: "John Doe"},
        status: "Delivered",
        createdAt: "2026-02-05T10:00:00Z",
    }
];

Object.defineProperty(window, 'localStorage', {
    value: {
        setItem: jest.fn(),
        getItem: jest.fn(() => JSON.stringify({token: 'fake-token', user: mockUser })),
        removeItem: jest.fn(),
    },
    writable: true,
});

describe("Profile to orders component flow", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test("Orders component refetches after auth user changes", async () => {
        // Initial GET for auth user
        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/user-profile")) {
                return Promise.resolve({data: {user: mockUser}});
            }
            if (url.includes("/api/v1/auth/orders")) {
                return Promise.resolve({data: sampleOrders});
            }
            return Promise.resolve({data: {}});
        });
        axios.put.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/profile")) {
                return Promise.resolve({data: {updatedUser}});
            }
        });

        render(
            <MemoryRouter>
                <AuthProvider>
                    <Profile/>
                    <Orders/>
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for initial Profile load
        await waitFor(() => {
            expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        });

            fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {target: {value: "Jane Doe"}});
            fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {target: {value: "0987654321"}});
            fireEvent.click(screen.getByText("UPDATE"));

        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/user-profile")) {
                return Promise.resolve({data: {user: updatedUser}});
            }

            if (url.includes("/api/v1/auth/orders")) {
                return Promise.resolve({
                    data: sampleOrders.map(order => ({
                        ...order,
                        buyer: {...order.buyer, name: updatedUser.name}
                    }))
                });
            }

            return Promise.resolve({data: {}});
        });

        // Wait for Profile to reflect updated user
        await waitFor(() => {
            expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
        });

        // Check Orders refetch after auth.user change
        await waitFor(() => {
            const ordersTable = screen.getByText("All Orders").closest("div");
            expect(within(ordersTable).getByText("Jane Doe")).toBeInTheDocument();
        });

        expect(
            axios.get.mock.calls.filter(
                call => call[0] === "/api/v1/auth/orders"
            )
        ).toHaveLength(2);

    });

    test("orders do not refetch if profile update fails", async () => {

        axios.put.mockResolvedValueOnce({
            data: {error: "Update failed"}
        });

        axios.get.mockResolvedValueOnce({data: sampleOrders});

        render(
            <MemoryRouter>
                <AuthProvider>
                    <Profile/>
                    <Orders/>
                </AuthProvider>
            </MemoryRouter>
        );

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {target: {value: "Jane Doe"}});
            fireEvent.click(screen.getByText("UPDATE"));
        });

        expect(
            axios.get.mock.calls.filter(
                call => call[0] === "/api/v1/auth/orders"
            )
        ).toHaveLength(1);

    });
//Partial updates
    test("orders component refetches if only phone is updated", async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/user-profile")) {
                return Promise.resolve({data: {user: mockUser}});
            }
            if (url.includes("/api/v1/auth/orders")) {
                return Promise.resolve({data: sampleOrders});
            }
            return Promise.resolve({data: {}});
        });

        // PUT for profile update
        const partiallyUpdatedUser = {...mockUser, phone: "1112223333"};
        axios.put.mockResolvedValueOnce({data: {updatedUser: partiallyUpdatedUser}});

        render(
            <MemoryRouter>
                <AuthProvider>
                    <Profile/>
                    <Orders/>
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for initial Profile load
        await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {target: {value: "1112223333"}});
            fireEvent.click(screen.getByText("UPDATE"));
        });

        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/user-profile")) {
                return Promise.resolve({data: {user: partiallyUpdatedUser}});
            }

            if (url.includes("/api/v1/auth/orders")) {
                return Promise.resolve({
                    data: sampleOrders.map(order => ({
                        ...order,
                        buyer: {...order.buyer, name: partiallyUpdatedUser.name}
                    }))
                });
            }

            return Promise.resolve({data: {}});
        });

        // Wait for Profile to reflect updated phone
        await waitFor(() => expect(screen.getByDisplayValue("1112223333")).toBeInTheDocument());

        // Orders should still display the correct buyer name (John Doe)
        await waitFor(() => {
            const ordersTable = screen.getByText("All Orders").closest("div");
            expect(within(ordersTable).getByText("John Doe")).toBeInTheDocument();
        });
    });
    test("orders component refetches if only address is updated", async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/user-profile")) {
                return Promise.resolve({data: {user: mockUser}});
            }
            if (url.includes("/api/v1/auth/orders")) {
                return Promise.resolve({data: sampleOrders});
            }
            return Promise.resolve({data: {}});
        });

        // PUT for profile update
        const partiallyUpdatedUser = {...mockUser, address: "newstreet"};
        axios.put.mockResolvedValueOnce({data: {updatedUser: partiallyUpdatedUser}});

        render(
            <MemoryRouter>
                <AuthProvider>
                    <Profile/>
                    <Orders/>
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for initial Profile load
        await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {target: {value: "newstreet"}});
            fireEvent.click(screen.getByText("UPDATE"));
        });

        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/user-profile")) {
                return Promise.resolve({data: {user: partiallyUpdatedUser}});
            }

            if (url.includes("/api/v1/auth/orders")) {
                return Promise.resolve({
                    data: sampleOrders.map(order => ({
                        ...order,
                        buyer: {...order.buyer, name: partiallyUpdatedUser.name}
                    }))
                });
            }

            return Promise.resolve({data: {}});
        });

        // Wait for Profile to reflect updated phone
        await waitFor(() => expect(screen.getByDisplayValue("newstreet")).toBeInTheDocument());

        // Orders should still display the correct buyer name (John Doe)
        await waitFor(() => {
            const ordersTable = screen.getByText("All Orders").closest("div");
            expect(within(ordersTable).getByText("John Doe")).toBeInTheDocument();
        });
    });
    test("Orders component renders all fields correctly after auth user changes", async () => {
        const updatedUser = {...mockUser, name: "Jane Doe"}
        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/user-profile")) {
                return Promise.resolve({data: {user: mockUser}});
            }
            if (url.includes("/api/v1/auth/orders")) {
                return Promise.resolve({data: sampleOrders});
            }
            return Promise.resolve({data: {}});
        });

        // PUT for profile update
        axios.put.mockResolvedValueOnce({data: {updatedUser: updatedUser}});

        render(
            <MemoryRouter>
                <AuthProvider>
                    <Profile/>
                    <Orders/>
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for initial profile load
        await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

            fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {target: {value: "Jane Doe"}});
            fireEvent.click(screen.getByText("UPDATE"));

        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/auth/user-profile")) {
                return Promise.resolve({data: {user: updatedUser}});
            }

            if (url.includes("/api/v1/auth/orders")) {
                return Promise.resolve({
                    data: sampleOrders.map(order => ({
                        ...order,
                        buyer: {...order.buyer, name: updatedUser.name}
                    }))
                });
            }

            return Promise.resolve({data: {}});
        });

        // Wait for profile to reflect updated name
        await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());

        // Check orders render all columns correctly
        await waitFor(() => {
            const ordersTable = screen.getByText("All Orders").closest("div");
            expect(within(ordersTable).getByText("Jane Doe")).toBeInTheDocument();
            expect(within(ordersTable).getByText("Product 1")).toBeInTheDocument();
            expect(within(ordersTable).getByText("Description 1")).toBeInTheDocument();
            expect(within(ordersTable).getByText("Delivered")).toBeInTheDocument();
            expect(within(ordersTable).getByText("Jane Doe")); // buyer check
        });
    });
});

