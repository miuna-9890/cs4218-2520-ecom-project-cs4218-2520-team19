// Teo Kim Han, A0273551E
// Below are tests for Registration and Login feature (with ref to 4-Member Testing Scope)

import { loginController, forgotPasswordController, testController, registerController } from "./authController";
import userModel from "../models/userModel";
import { hashPassword, comparePassword } from "../helpers/authHelper";
import JWT from "jsonwebtoken";

jest.mock('../models/userModel');
jest.mock('../helpers/authHelper');
jest.mock('jsonwebtoken');


describe('registerController tests', () => {
    const mockUser = {
        name: 'John',
        email: 'john@gmail.com',
        password: 'password123',
        phone: '11112222',
        address: 'hillview street 12',
        answer: 'football',
    };

    let req, res;

    beforeEach(() => {
        req = { body: {...mockUser} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validation tests', () => {
        let invalidReqList = [];
        const keys = Object.keys(mockUser);

        for (let i = 0; i < keys.length; i++) {
            const newReq = { 
                body: { ...mockUser }
            };
            newReq.body[keys[i]] = '';
            invalidReqList.push([keys[i], newReq]);
        }

        it.each(invalidReqList)('should send a response with status code 400 due to empty %s',
            async (field, invalidReq) => {
                await registerController(invalidReq, res);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                    success: false,
                    message: expect.any(String),
                }));
        });
    });

    it('should send a response with status code 409 if duplicate email exists', async () => {
        // Mock findOne to return an existing user
        userModel.findOne.mockResolvedValue({...mockUser}); 

        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.any(String),
        }));
    });

    it('should save the user with hashed password', async () => {
        userModel.findOne.mockResolvedValueOnce(null); // no existing user
        hashPassword.mockResolvedValue('hashedPassword'); // successful hash
        const updatedMockUser = {
            ...mockUser,
            password: 'hashedPassword'
        };
        const saveMock = jest.fn().mockResolvedValue(updatedMockUser);
        // Mock userModel constructor
        userModel.mockImplementation(() => {
            return {save: saveMock}
        });

        await registerController(req, res);

        expect(userModel).toHaveBeenCalledWith({
            name: 'John',
            email: 'john@gmail.com',
            password: 'hashedPassword',
            phone: '11112222',
            address: 'hillview street 12',
            answer: 'football',
        });
        expect(saveMock).toHaveBeenCalled();
    });

    it('should send a response with status code 201 if user register successfully', async () => {
        userModel.findOne.mockResolvedValueOnce(null); // no existing user
        hashPassword.mockResolvedValue('hashedPassword'); // successful hash
        const updatedMockUser = {
            ...mockUser,
            password: 'hashedPassword'
        };
        const saveMock = jest.fn().mockResolvedValue(updatedMockUser);
        // Mock userModel constructor
        userModel.mockImplementation(() => {
            return {save: saveMock}
        });
        
        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: expect.any(String),
        }));
    });
    
    it('should send a response with status code 500 if an error occurred', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        const error = new Error('No connection to database');
        userModel.findOne.mockRejectedValueOnce(error);

        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.any(String),
            error: error,
        }));

        console.log.mockRestore();
    });
});

describe('loginController tests', () => {
    const mockUser = {
        _id: '123',
        name: 'John',
        email: 'john@gmail.com',
        password: 'hashedPassword123',
        phone: '11112222',
        address: 'hillview street 12',
        role: 0,
        answer: 'football',
    };
    
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                email: 'john@gmail.com',
                password: 'password123',
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a response code of 400 for missing email', async () => {
        req.body.email = '';

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Missing email or password"
        });
    });

    it('should return a response code of 400 for missing password', async () => {
        req.body.password = '';

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Missing email or password"
        });
    });

    it('should return a response code of 400 for both invalid email and password', async () => {
        req.body.email = '';
        req.body.password = '';
        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Missing email or password"
        });
    });

    it('should return response code of 404 if user not found', async () => {
        userModel.findOne.mockResolvedValueOnce(null);

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: 'Email is not registered',
        });
    });

    it('should return response code of 401 if password is incorrect', async () => {
        userModel.findOne.mockResolvedValueOnce(mockUser);
        comparePassword.mockResolvedValueOnce(false);

        await loginController(req, res);

        expect(comparePassword).toHaveBeenCalledWith('password123', 'hashedPassword123');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Incorrect Password",
        });
    });

    it('should generate a token for valid user', async () => {
        userModel.findOne.mockResolvedValueOnce(mockUser);
        comparePassword.mockResolvedValueOnce(true);
        jest.spyOn(JWT, 'sign');

        await loginController(req, res);

        expect(JWT.sign).toHaveBeenCalledWith(
            {_id: '123'}, 
            process.env.JWT_SECRET, 
            {expiresIn: expect.any(String)}
        );

        JWT.sign.mockRestore();
    });

    it('should send a response code of 200 for successful login', async () => {
        userModel.findOne.mockResolvedValueOnce(mockUser);
        comparePassword.mockResolvedValueOnce(true);
        JWT.sign.mockResolvedValueOnce('mockToken');

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Login Successfully",
            user: {
                _id: '123',
                name: 'John',
                email: 'john@gmail.com',
                phone: '11112222',
                address: 'hillview street 12',
                role: 0,
            },
            token: 'mockToken',
        });
    });

    it('should send a response code of 500 when an error occurred', async () => {
        const error = new Error('Unexpected error while finding user');
        userModel.findOne.mockRejectedValueOnce(error);
        jest.spyOn(console, 'log').mockImplementation(() => {});

        await loginController(req, res);

        expect(console.log).toHaveBeenCalledWith(error);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: expect.any(String),
            error: error,
        });

        console.log.mockRestore();
    });
});

describe('forgotPasswordController tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                email: 'john@example.com',
                answer: 'basketball',
                newPassword: 'mockNewPassword',
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should send a response code of 400 for missing email', async () => {
        req.body.email = '';

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Email is required",
        });
    });

    it('should send a response code of 400 for missing answer', async () => {
        req.body.answer = '';

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Answer is required",
        });
    });

    it('should send a response code of 400 for missing new Password', async () => {
        req.body.newPassword = '';

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "New Password is required",
        });
    });

    it('should send a response code of 404 for user not found', async () => {
        userModel.findOne.mockResolvedValueOnce(null);

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: expect.any(String),
        });
    });

    it('should hash the new password', async () => {
        const mockUser = { _id: '123' };
        userModel.findOne.mockResolvedValueOnce(mockUser);
        hashPassword.mockResolvedValueOnce('mockHashedPassword');

        await forgotPasswordController(req, res);

        expect(hashPassword).toHaveBeenCalledWith('mockNewPassword');
    });

    it('should update the user password with the new hashed password', async () => {
        const mockUser = { _id: '123' };
        userModel.findOne.mockResolvedValueOnce(mockUser);
        hashPassword.mockResolvedValueOnce('mockHashedPassword');
        userModel.findByIdAndUpdate.mockResolvedValueOnce(mockUser);

        await forgotPasswordController(req, res);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('123', { 
            password: 'mockHashedPassword' 
        });
    });

    it('should send a response code of 200 if password change is successful', async () => {
        const mockUser = { _id: '123' };
        userModel.findOne.mockResolvedValueOnce(mockUser);
        hashPassword.mockResolvedValueOnce('mockHashedPassword');
        userModel.findByIdAndUpdate.mockResolvedValueOnce(mockUser);

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Password Changed Successfully",
        });
    });

    it('should send a response code of 500 if an error occured', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        const error = new Error('something unexpected happened');
        userModel.findOne.mockRejectedValueOnce(error);

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: expect.any(String),
            error,
        });

        console.log.mockRestore();
    });
});

describe('testController tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should send a response with status code 200 if no error occurred', () => {
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        testController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalled();
    });

    it('should send a response with status code 500 if an error occurred', () => {
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockImplementationOnce(() => { 
                throw new Error('testController error') 
            }),
        };
        jest.spyOn(console, 'log').mockImplementation(() => {});

        testController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledTimes(2);

        console.log.mockRestore();
    });
});