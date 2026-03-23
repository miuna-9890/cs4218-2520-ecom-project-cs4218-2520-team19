// Teo Kim Han, A0273551E

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Register from './Register';

jest.mock('axios');
jest.mock('react-hot-toast');
// Mock Layout to isolate Register.js away from the many "dependencies" in Header that is part of Layout
jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));
jest.mock('../../context/auth', () => ({
  useAuth: () => [null, jest.fn()]
}));


describe('Register Component', () => {
  const fillAllEntries = () => {
    fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
    fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), { target: { value: 'Football' } });
  };

  let res;
  
  beforeEach(() => {
    res = {
      data: {
        success: null,
        message: '',
      }
    };
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<div data-testid="mockLoginPage">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the register page', () => {
    expect(screen.getByText('REGISTER FORM')).toBeInTheDocument();
  });

  it('should have empty entries initially', () =>{
    expect(screen.getByPlaceholderText('Enter Your Name').value).toBe('');
    expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('');
    expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('');
    expect(screen.getByPlaceholderText('Enter Your Phone').value).toBe('');
    expect(screen.getByPlaceholderText('Enter Your Address').value).toBe('');
    expect(screen.getByPlaceholderText('What is Your Favorite sports').value).toBe('');
  });

  it('should allow typing of all entries', () => {
    fillAllEntries();

    expect(screen.getByPlaceholderText('Enter Your Name').value).toBe('John Doe');
    expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('test@example.com');
    expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('password123');
    expect(screen.getByPlaceholderText('Enter Your Phone').value).toBe('1234567890');
    expect(screen.getByPlaceholderText('Enter Your Address').value).toBe('123 Street');
    expect(screen.getByPlaceholderText('What is Your Favorite sports').value).toBe('Football');
  });

  it('should not make a post request if name input is empty', async () => {
    fillAllEntries();
    fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: '' } });
    
    fireEvent.click(screen.getByText('REGISTER'));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should not make a post request if email input is empty', async () => {
    fillAllEntries();
    fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: '' } });

    fireEvent.click(screen.getByText('REGISTER'));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should not make a post request if password is empty', async () => {
    fillAllEntries();
    fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: '' } });

    fireEvent.click(screen.getByText('REGISTER'));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should not make a post request if phone is empty', async () => {
    fillAllEntries();
    fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: '' } });

    fireEvent.click(screen.getByText('REGISTER'));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should not make a post request if address is empty', async () => {
    fillAllEntries();
    fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: '' } });

    fireEvent.click(screen.getByText('REGISTER'));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should not make a post request if answer is empty', async () => {
    fillAllEntries();
    fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), { target: { value: '' } });

    fireEvent.click(screen.getByText('REGISTER'));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should register the user successfully', async () => {
    res.data.success = true;
    axios.post.mockResolvedValueOnce(res);

    fillAllEntries();

    fireEvent.click(screen.getByText('REGISTER'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(res.data.message);
    await waitFor(() => expect(screen.getByTestId('mockLoginPage')).toBeInTheDocument());
  });

  it('should display error message on failed registration', async () => {
    const error = new Error('User already exists');
    axios.post.mockRejectedValueOnce(error);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    fillAllEntries();

    fireEvent.click(screen.getByText('REGISTER'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('User already exists');

    console.log.mockRestore();
  });

  it('should display response message upon receiving unsuccessful response', async () => {
    res.data.success = false;
    res.data.message = 'invalid field given';
    axios.post.mockResolvedValueOnce(res);

    fillAllEntries();
    fireEvent.click(screen.getByText('REGISTER'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('invalid field given');
  })
});
