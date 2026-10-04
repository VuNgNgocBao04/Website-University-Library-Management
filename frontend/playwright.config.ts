import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',workers:1,timeout:60000,use:{baseURL:'http://127.0.0.1:5173',channel:'chrome',headless:true,locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh',screenshot:'only-on-failure'},reporter:[['list']]});
