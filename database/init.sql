CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    full_name VARCHAR(100),
    account_number VARCHAR(20) UNIQUE,
    balance NUMERIC(15,2) DEFAULT 0,
    debit_card_number VARCHAR(20),
    debit_card_balance NUMERIC(15,2),
    credit_card_number VARCHAR(20),
    credit_card_limit NUMERIC(15,2)
);

CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    loan_type VARCHAR(30),
    amount NUMERIC(15,2),
    outstanding NUMERIC(15,2)
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    from_user INT,
    to_user INT,
    amount NUMERIC(15,2),
    mode VARCHAR(10),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10 prebuilt users (password is same as username for demo)
INSERT INTO users (username, password, full_name, account_number, balance, debit_card_number, debit_card_balance, credit_card_number, credit_card_limit) VALUES
('leonard',  'leonard',  'Leonard Lopez',   'AC1000000001', 632449.00, '4111 1111 1111 3377', 632449.00, '5500 0000 0000 1234', 200000.00),
('marie',    'marie',    'Marie Fernandes', 'AC1000000002', 154320.50, '4111 2222 3333 4444', 154320.50, '5500 1111 2222 3333', 150000.00),
('john',     'john',     'John Mathew',     'AC1000000003', 89765.75,  '4111 3333 4444 5555', 89765.75,  '5500 2222 3333 4444', 100000.00),
('viviana',  'viviana',  'Viviana Rao',     'AC1000000004', 275000.00, '4111 4444 5555 6666', 275000.00, '5500 3333 4444 5555', 250000.00),
('rahul',    'rahul',    'Rahul Chanda',    'AC1000000005', 998000.00, '4111 5555 6666 7777', 998000.00, '5500 4444 5555 6666', 500000.00),
('priya',    'priya',    'Priya Sharma',    'AC1000000006', 45600.25,  '4111 6666 7777 8888', 45600.25,  '5500 5555 6666 7777', 75000.00),
('arjun',    'arjun',    'Arjun Nair',      'AC1000000007', 312450.00, '4111 7777 8888 9999', 312450.00, '5500 6666 7777 8888', 300000.00),
('sneha',    'sneha',    'Sneha Iyer',      'AC1000000008', 67890.00,  '4111 8888 9999 0000', 67890.00,  '5500 7777 8888 9999', 120000.00),
('karan',    'karan',    'Karan Mehta',     'AC1000000009', 523100.00, '4111 9999 0000 1111', 523100.00, '5500 8888 9999 0000', 400000.00),
('divya',    'divya',    'Divya Kapoor',    'AC1000000010', 187650.50, '4111 0000 1111 2222', 187650.50, '5500 9999 0000 1111', 180000.00);

INSERT INTO loans (user_id, loan_type, amount, outstanding) VALUES
(1, 'Vehicle',  800000.00, 450000.00),
(1, 'Personal', 200000.00, 120000.00),
(5, 'Vehicle',  1200000.00, 900000.00),
(3, 'Personal', 150000.00, 50000.00),
(7, 'Vehicle',  600000.00, 300000.00);

CREATE TABLE beneficiaries (
    id SERIAL PRIMARY KEY,
    owner_user_id INT REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    ifsc VARCHAR(15),
    transfer_type VARCHAR(10) NOT NULL,     -- INTERNAL | EXTERNAL
    linked_user_id INT,                     -- set when bank = Monex and account matches a user
    created_at TIMESTAMP DEFAULT NOW()
);

-- External bank dummy beneficiaries
INSERT INTO beneficiaries (owner_user_id, name, account_number, bank_name, ifsc, transfer_type) VALUES
(1, 'Ramesh Iyer',      '50214478993201', 'HDFC Bank',            'HDFC0001234', 'EXTERNAL'),
(1, 'Anita Deshmukh',   '33907712445502', 'ICICI Bank',           'ICIC0004321', 'EXTERNAL'),
(1, 'Vikram Singh',     '78452210663303', 'State Bank of India',  'SBIN0009876', 'EXTERNAL'),
(1, 'Neha Joshi',       '66129987332104', 'Axis Bank',            'UTIB0005555', 'EXTERNAL'),
(2, 'Suresh Pillai',    '44783325991005', 'Kotak Mahindra Bank',  'KKBK0007777', 'EXTERNAL'),
(2, 'Fatima Sheikh',    '99214432778806', 'Punjab National Bank', 'PUNB0002222', 'EXTERNAL'),
(3, 'Aditya Rane',      '22876654119907', 'Bank of Baroda',       'BARB0003333', 'EXTERNAL'),
(3, 'Kavya Menon',      '88342219556608', 'Yes Bank',             'YESB0008888', 'EXTERNAL'),
(5, 'Rohit Malhotra',   '11223344556609', 'IndusInd Bank',        'INDB0006666', 'EXTERNAL'),
(5, 'Lakshmi Narayan',  '77889900112210', 'Canara Bank',          'CNRB0001111', 'EXTERNAL');