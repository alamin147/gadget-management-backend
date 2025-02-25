"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const config_1 = __importDefault(require("./app/config"));
const app_1 = __importStar(require("./app"));
const mongoose_1 = __importDefault(require("mongoose"));
const port = process.env.PORT || 5000;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(config_1.default.database_url);
            const users = app_1.client.db('electronicGadgets').collection('users');
            //superAdmin
            const adminData = {
                name: 'admin',
                username: 'superAdmin',
                email: 'admin@a.c',
                contactNo: '12345',
                password: 'admin',
                imgUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-370-456322.png?f=webp',
                role: 'superAdmin',
            };
            const superAdmin = () => __awaiter(this, void 0, void 0, function* () {
                const admin = yield users.findOne({ role: 'superAdmin' });
                if (!admin) {
                    users.insertOne(adminData);
                }
            });
            app_1.default.listen(port, () => __awaiter(this, void 0, void 0, function* () {
                yield superAdmin();
                console.log(`Server is running on port ${port}`);
            }));
        }
        catch (error) {
            console.log(error);
        }
    });
}
main();
