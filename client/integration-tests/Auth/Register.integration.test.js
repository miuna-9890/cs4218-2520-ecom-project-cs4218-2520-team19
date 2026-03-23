// Teo Kim Han, A0273551E
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Login from '../../src/pages/Auth/Login';
import Register from '../../src/pages/Auth/Register';
import { AuthProvider } from '../../src/context/auth';

jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('../../src/components/Layout', () => ({ children, title }) => (
    <div>
        <title>{title}</title>
        {children}
    </div>
));

const renderAuthComponents = () => {
    render(
        <AuthProvider>
            <MemoryRouter initialEntries={['/register']}>
                <Routes>
                    <Route path='/' element={<div data-testid='homepage'>Mock Home Page</div>} />
                    <Route path='/login' element={<Login />} />
                    <Route path='/register' element={<Register />} />
                </Routes>
            </MemoryRouter>
        </AuthProvider>
    );
};

describe('Register-Login Frontend Integration Test', () => {
    const user = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        phone: '1234567890',
        address: '123 Test St',
        answer: 'Soccer'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Successful Registration navigates to Login Page', async () => {
        const stubResponse = {
            data: {
                success: true,
                message: 'User Registered Successfully',
            }
        }
        axios.post.mockResolvedValueOnce(stubResponse);
        renderAuthComponents();

        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: user.name } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: user.email } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: user.password } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: user.phone } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: user.address } });
        fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), { target: { value: user.answer } });
        fireEvent.click(screen.getByText('REGISTER'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", user);
            expect(toast.success).toHaveBeenCalledWith(stubResponse.data.message);
            expect(screen.getByText('LOGIN FORM')).toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledTimes(1);
    });

    test('Failed Registration does not navigate to Login Page', async () => {
        const stubResponse = {
            data: {
                success: false,
                message: 'Already Registered, Please Login'
            }
        };
        axios.post.mockResolvedValueOnce(stubResponse);
        renderAuthComponents();

        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: user.name } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: user.email } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: user.password } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: user.phone } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: user.address } });
        fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), { target: { value: user.answer } });
        fireEvent.click(screen.getByText('REGISTER'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", user);
            expect(toast.error).toHaveBeenCalledWith(stubResponse.data.message);
            expect(screen.queryByText('LOGIN FORM')).not.toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledTimes(1);
    });

    test('Failed Registration with Network Error does not navigate to Login Page', async () => {
        axios.post.mockRejectedValueOnce(new Error('Network Error'));
        renderAuthComponents();
        jest.spyOn(console, 'log').mockImplementation(() => {});

        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: user.name } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: user.email } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: user.password } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: user.phone } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: user.address } });
        fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), { target: { value: user.answer } });
        fireEvent.click(screen.getByText('REGISTER'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", user);
            expect(screen.queryByText('LOGIN FORM')).not.toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledTimes(1);
        console.log.mockRestore();
    });
});