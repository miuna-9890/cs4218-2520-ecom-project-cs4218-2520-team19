// Varatharaju Mithuna, A0281223N

import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import {render, screen, fireEvent, waitFor, within, act} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../../src/pages/user/Profile';
import Dashboard from "../../src/pages/user/Dashboard";
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
    email: "John@gmail.com",
    address: "456 Avenue",
    password: "newpassword123",
};

Object.defineProperty(window, 'localStorage', {
    value: {
        setItem: jest.fn(),
        getItem: jest.fn(() => JSON.stringify({token: 'fake-token', user: mockUser })),
        removeItem: jest.fn(),
    },
    writable: true,
});

describe("Profile to Dashboard integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Dashboard reflects full profile update", async () => {
        // Mock axios GET/PUT calls
        axios.get
            .mockResolvedValueOnce({ data: { user: mockUser } })   // Profile initial load
            .mockResolvedValueOnce({ data: { user: updatedUser } }); // Profile after PUT

        axios.put.mockResolvedValueOnce({ data: { updatedUser } });

        render(
            <MemoryRouter>
                <AuthProvider>
                    <Profile />
                    <Dashboard />
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for initial profile load
        await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

        // Update profile name and address
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), { target: { value: "Jane Doe" } });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), { target: { value: "456 Avenue" } });
            fireEvent.click(screen.getByText("UPDATE"));
        });

        // Wait for updated profile in Profile component
        await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());

        const dashboardContainer = document.querySelector('div.dashboard');
        const card = within(dashboardContainer);
        expect(card.getByText("Jane Doe")).toBeInTheDocument();
        expect(card.getByText("John@gmail.com")).toBeInTheDocument();
        expect(card.getByText("456 Avenue")).toBeInTheDocument();
    });

    test("Dashboard reflects partial update (address only)", async () => {
        const partiallyUpdatedUser = { ...mockUser, address: "New Street" };
        axios.get.mockResolvedValueOnce({ data: { user: mockUser } });
        axios.put.mockResolvedValueOnce({ data: { updatedUser: partiallyUpdatedUser } });

        render(
            <MemoryRouter>
                <AuthProvider>
                    <Profile />
                    <Dashboard />
                </AuthProvider>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), { target: { value: "New Street" } });
            fireEvent.click(screen.getByText("UPDATE"));
        });

        await waitFor(() => expect(screen.getByDisplayValue("New Street")).toBeInTheDocument());

        const card = within(document.querySelector('div.dashboard .card'));
        expect(card.getByText("John Doe")).toBeInTheDocument();        // unchanged
        expect(card.getByText("John@gmail.com")).toBeInTheDocument();   // unchanged
        expect(card.getByText("New Street")).toBeInTheDocument();
    });

    test("Dashboard does not change if profile update fails", async () => {
        axios.get.mockResolvedValueOnce({ data: { user: mockUser } });
        axios.put.mockResolvedValueOnce({ data: { error: "Update failed" } });

        render(
            <MemoryRouter>
                <AuthProvider>
                    <Profile />
                    <Dashboard />
                </AuthProvider>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), { target: { value: "Jane Doe" } });
            fireEvent.click(screen.getByText("UPDATE"));
        });

        // Dashboard should still show original info
        const card = within(document.querySelector('div.dashboard .card'));
        expect(card.getByText("John Doe")).toBeInTheDocument();
        expect(card.getByText("John@gmail.com")).toBeInTheDocument();
        expect(card.getByText("123 Street")).toBeInTheDocument();
    });
});