// Teo Kim Han, A0273551E
import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import ForgotPassword from "../../src/pages/Auth/ForgotPassword";
import Login from "../../src/pages/Auth/Login";
import { AuthProvider } from "../../src/context/auth";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../../src/components/Layout", () => ({ children, title }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
));

const renderForgotPassword = () => {
  render(
    <AuthProvider>
        <MemoryRouter initialEntries={["/forgot-password"]}>
            <Routes>
                <Route path='/login' element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
            </Routes>
        </MemoryRouter>
    </AuthProvider>
  );
};

describe("ForgotPassword to Login Frontend Integration Test", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Happy Path: Successful Password Change should navigate to Login Page', async () => {
        const email = "test@example.com";
        const answer = "Cricket";
        const newPassword = "NewPassword123";
        const stubResponse = { data: { success: true, message: "Password Changed Successfully" } };
        axios.post.mockResolvedValue(stubResponse);

        renderForgotPassword();

        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: email } });
        fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), { target: { value: answer } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your New Password'), { target: { value: newPassword } });
        fireEvent.click(screen.getByText("CHANGE PASSWORD"));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
                email,
                answer,
                newPassword,
            });
            expect(toast.success).toHaveBeenCalledWith(stubResponse.data.message);
            expect(screen.getByText('LOGIN FORM')).toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledTimes(1);
    });

    test('Failed Password Change with Incorrect Answer or Email does not navigate to Login Page', async () => {
        const email = "test@example.com";
        const answer = "Incorrect Answer";
        const newPassword = "NewPassword123";
        const stubResponse = { data: { success: false, message: "User cannot be found" } };
        axios.post.mockResolvedValue(stubResponse);

        renderForgotPassword();

        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: email } });
        fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), { target: { value: answer } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your New Password'), { target: { value: newPassword } });
        fireEvent.click(screen.getByText("CHANGE PASSWORD"));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
                email,
                answer,
                newPassword,
            });
            expect(toast.error).toHaveBeenCalledWith(stubResponse.data.message);
            expect(screen.queryByText('LOGIN FORM')).not.toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledTimes(1);
    });

    test('Failed Password Change with Network Error does not navigate to Login Page', async () => {
        const email = "test@example.com";
        const answer = "Cricket";
        const newPassword = "NewPassword123";
        axios.post.mockRejectedValue(new Error("Network Error"));
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to suppress error logs

        renderForgotPassword();

        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: email } });
        fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), { target: { value: answer } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your New Password'), { target: { value: newPassword } });
        fireEvent.click(screen.getByText("CHANGE PASSWORD"));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
                email,
                answer,
                newPassword,
            });
            expect(screen.queryByText('LOGIN FORM')).not.toBeInTheDocument();
        });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledTimes(1);

        console.log.mockRestore();
    });
});
