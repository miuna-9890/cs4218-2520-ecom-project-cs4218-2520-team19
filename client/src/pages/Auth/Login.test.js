// Teo Kim Han, A0273551E

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Login from './Login';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

const mockSetAuth = jest.fn();
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [null, mockSetAuth]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

const mockSetItem = jest.fn();
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: mockSetItem,
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

describe('Login Component', () => {
    beforeEach(() => {
        render(
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/" element={<div data-testid='homepage'>Mock Home Page</div>} />
              <Route path="/login" element={<Login />} />
              <Route path="forgot-password" element={<div data-testid='forgotpassword'>Mock Forgot Password Page</div>} />
            </Routes>
          </MemoryRouter>
        );
    });

    afterEach(() => {
      jest.clearAllMocks();
    })

    it('renders login form', () => {
      expect(screen.getByText('LOGIN FORM')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter Your Password')).toBeInTheDocument();
    });

    it('inputs should be initially empty', () => {
      expect(screen.getByText('LOGIN FORM')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('');
      expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('');
    });
    
    it('should allow typing email and password', () => {
      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });

      expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('test@example.com');
      expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('password123');
    });

    it('should not make a post request if email is missing', () => {
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });

      fireEvent.click(screen.getByText('LOGIN'));

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should not make a post request if password is missing', () => {
      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });

      fireEvent.click(screen.getByText('LOGIN'));

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should show notification if login the user successfully', async () => {
      const res = {
        data: {
          success: true,
          message: 'Login Successful',
          user: { id: 1, name: 'John Doe', email: 'test@example.com' },
          token: 'mockToken'
        }
      };
      axios.post.mockResolvedValueOnce(res);
      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      // Checks that at least the message field in response is shown in notification
      expect(toast.success.mock.lastCall).toEqual(expect.arrayContaining(['Login Successful']));
    });

    it('should set auth on successful login', async () => {
      const res = {
        data: {
            success: true,
            message: 'Login Successful',
            user: { id: 1, name: 'John Doe', email: 'test@example.com' },
            token: 'mockToken'
        }
      };
      axios.post.mockResolvedValueOnce(res);
      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(mockSetAuth).toHaveBeenCalledWith({
        user: { id: 1, name: 'John Doe', email: 'test@example.com' },
        token: 'mockToken', 
      });
    });

    it('should set auth into local storage on successful login', async () => {
      const res = {
        data: {
            success: true,
            message: 'Login Successful',
            user: { id: 1, name: 'John Doe', email: 'test@example.com' },
            token: 'mockToken'
        }
      };
      axios.post.mockResolvedValueOnce(res);
      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(mockSetItem).toHaveBeenCalledWith('auth', JSON.stringify({
        user: { id: 1, name: 'John Doe', email: 'test@example.com' },
        token: 'mockToken'
      }));
    });
    
    it('should navigate to home page after successful login', async () => {
      const res = {
        data: {
          success: true,
          message: 'Login Successful',
          user: { id: 1, name: 'John Doe', email: 'test@example.com' },
          token: 'mockToken'
        }
      };
      axios.post.mockResolvedValueOnce(res);
      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => expect(screen.getByTestId('homepage')).toBeInTheDocument());
    });

    it('should display error message on failed login', async () => {
      axios.post.mockRejectedValueOnce({ message: 'Invalid credentials' });
      jest.spyOn(console, 'log').mockImplementation(() => {});
      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByText('LOGIN'));
      
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(console.log).toHaveBeenCalledWith({ message: 'Invalid credentials' });
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
      
      console.log.mockRestore();
    });

    it('should display message if unsuccessful response', async () => {
      axios.post.mockResolvedValueOnce({data: {success: false, message: 'something went wrong'}});
      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith('something went wrong');
    });

    it('should be able to navigate to forgot password page', async () => {
      fireEvent.click(screen.getByText('Forgot Password'));

      await waitFor(() => expect(screen.getByTestId('forgotpassword')).toBeInTheDocument());
    });
});
