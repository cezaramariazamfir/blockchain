declare module 'circomlibjs'; 

// pentru ca primeam eroare in merkle.ts:
//Could not find a declaration file for module 'circomlibjs'. 'c:/Users/crist/Documents/FACULTATE/ANUL 3/BLOCKCHAIN/PROIECT/blockchain/node_modules/circomlibjs/build/main.cjs' implicitly has an 'any' type.
//Try `npm i --save-dev @types/circomlibjs` if it exists or add a new declaration (.d.ts) file containing `declare module 'circomlibjs';`ts(7016)


interface Window { //spune fisierului admin/page.tsx ca exista posibilitatea ca window sa aiba o proprietate "ethereum", deci sa nu mai dea eroare
    ethereum?: {
        isMetaMask?: boolean;
        request: (...args: any[]) => Promise<any>;
        on: (event: string, callback: (...args: any[]) => void) => void;
        removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
}