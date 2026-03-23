// Teo Kim Han, A0273551E
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Login from '../../src/pages/Auth/Login';
import { useAuth, AuthProvider } from '../../src/context/auth';
import ForgotPassword from '../../src/pages/Auth/ForgotPassword';


jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('../../src/components/Layout', () => ({ children, title }) => (
    <div>
        <title>{title}</title>
        {children}
    </div>
));


const AuthConsumer = () => {
    const [auth] = useAuth();
    return <div data-testid="auth-state">{JSON.stringify(auth)}</div>;
};

describe('Login and AuthProvider Frontend Integration Test', () => {
    const renderLogin = () => {
        render(
            <AuthProvider>
                <MemoryRouter initialEntries={['/login']}>
                    <Routes>
                        <Route path='/' element={<div data-testid='homepage'>Mock Home Page</div>} />
                        <Route path="/login" element={<Login />} />
                    </Routes>
                    <AuthConsumer />
                </MemoryRouter>
            </AuthProvider>
        );
    };

    const user = {
        _id: 'testUserId',
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        address: '123 Test St',
        role: 0,
    };

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    test('Happy Path: Successful Login with Valid Credentials should set auth state, update auth in local storage and navigate to homepage',
        async () => {
            const stubResponse = {
                data: {
                    success: true,
                    message: 'Login successful',
                    user: { ...user },
                    token: 'testToken123',
                },
            };
            axios.post.mockResolvedValueOnce(stubResponse);
            renderLogin();

            fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByText('LOGIN'));

            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
                    email: 'test@example.com',
                    password: 'password123'
                });
                expect(screen.getByTestId('auth-state').textContent).toBe(JSON.stringify({
                    user: user,
                    token: 'testToken123',
                }));
                expect(localStorage.getItem('auth')).toBe(JSON.stringify({
                    user: user,
                    token: 'testToken123',
                }));
                expect(toast.success).toHaveBeenCalledWith(stubResponse.data.message, expect.objectContaining({}));
                expect(screen.getByTestId('homepage')).toBeInTheDocument();
            });
            expect(axios.post).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledTimes(1);
        }
    );

    test('Failed Login with Invalid Credentials', async () => {
        const stubResponse = {
            data: {
                success: false,
                message: 'Invalid credentials',
            },
        };
        axios.post.mockResolvedValueOnce(stubResponse);
        renderLogin();

        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'wrongpassword' } });
        fireEvent.click(screen.getByText('LOGIN'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
                email: 'test@example.com',
                password: 'wrongpassword'
            });
            expect(toast.error).toHaveBeenCalledWith(stubResponse.data.message);
            expect(screen.queryByTestId('homepage')).not.toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledTimes(1);
    });

    test('Failed Login with Network Error', async () => {
        const mockError = new Error('Network Error');
        axios.post.mockRejectedValueOnce(mockError);
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to suppress error logs
        
        renderLogin();

        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByText('LOGIN'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
                email: 'test@example.com',
                password: 'password123'
            });
            expect(screen.queryByTestId('homepage')).not.toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledTimes(1);
        
        console.log.mockRestore();
    });
});

describe('Login-ForgotPassword Frontend Integration Test', () => {
    const renderLogin = () => {
        render(
            <AuthProvider>
                <MemoryRouter initialEntries={['/login']}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path='/forgot-password' element={<ForgotPassword />} />
                    </Routes>
                    <AuthConsumer />
                </MemoryRouter>
            </AuthProvider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Navigate to Forgot Password Page from Login Page', async () => {
        renderLogin();

        fireEvent.click(screen.getByText('Forgot Password'));

        await waitFor(() => {
            expect(screen.getByText('FORGOT PASSWORD FORM')).toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(0);
    });
});