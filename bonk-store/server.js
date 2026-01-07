require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(express.static('public', { extensions: ['html', 'htm'] }));
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

// --- VALIDAÇÃO DE PASSWORD ---
function isPasswordStrong(password) {
    // Regex: 12 chars, 1 maiúscula, 1 minúscula, 1 número, 1 símbolo
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;
    return regex.test(password);
}

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
// Esta função serve de "Segurança". Só deixa passar quem tiver um Token válido.
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // O token vem no formato "Bearer KJHKSJDH...", queremos só a parte do código
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acesso negado' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user; // Guarda os dados do user no pedido para serem usados nas rotas
        next();
    });
}

// --- MIDDLEWARE: VERIFICAR PERMISSÃO DE ADMIN/STAFF ---
function authorizeStaff(req, res, next) {
    // O authenticateToken já correu antes disto, por isso temos req.user
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) {
        return res.status(403).json({ error: 'Acesso restrito a Staff.' });
    }
    next();
}

// ==========================================
// ROTAS DE BACKOFFICE (ADMIN)
// ==========================================

// Ver TODAS as Encomendas (com dados do cliente)
app.get('/api/admin/orders', authenticateToken, authorizeStaff, async (req, res) => {
    try {
        // Busca encomendas + nome do cliente
        const [orders] = await pool.query(`
            SELECT o.id_order, o.total_amount, o.status, o.created_at, 
                   u.name as client_name, u.email as client_email,
                   COUNT(oi.id_order_item) as total_items
            FROM orders o
            JOIN users u ON o.id_user = u.id_user
            LEFT JOIN order_items oi ON o.id_order = oi.id_order
            GROUP BY o.id_order, o.total_amount, o.status, o.created_at, u.name, u.email
            ORDER BY o.created_at DESC
        `);
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar encomendas.' });
    }
});

// Alterar Estado da Encomenda
app.put('/api/admin/orders/:id/status', authenticateToken, authorizeStaff, async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    // Lista de status válidos (igual ao ENUM da DB)
    const validStatus = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'];

    if (!validStatus.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido.' });
    }

    try {
        await pool.query('UPDATE orders SET status = ? WHERE id_order = ?', [status, orderId]);
        res.json({ message: `Encomenda #${orderId} atualizada para ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar estado.' });
    }
});

// --- MIDDLEWARE: APENAS ADMIN ---
function authorizeAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso exclusivo a Administradores.' });
    }
    next();
}

// ==========================================
// GESTÃO DE PRODUTOS E COLEÇÕES (Backoffice)
// ==========================================

// --- ROTA: Listar Coleções ---
app.get('/api/collections', async (req, res) => {
    try {
        // Traz apenas as ativas
        const [rows] = await pool.query("SELECT * FROM collections WHERE status = 'active'");
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar coleções.' }); }
});

// --- ROTA: Criar Coleção ---
app.post('/api/admin/collections', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
    try {
        await pool.query('INSERT INTO collections (name, status) VALUES (?, "active")', [name]);
        res.json({ message: 'Coleção criada!' });
    } catch (error) { res.status(500).json({ error: 'Erro ao criar coleção.' }); }
});

// --- ROTA: Criar Categoria ---
app.post('/api/admin/categories', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });

    try {
        await pool.query('INSERT INTO categories (name, status) VALUES (?, "active")', [name]);
        res.json({ message: 'Categoria criada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar categoria.' });
    }
});

// --- ROTA: Listar Cores (Para o Dropdown do Admin) ---
app.get('/api/colors', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM colors ORDER BY name ASC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cores.' });
    }
});

// --- ROTA: LISTAR TAMANHOS ---
app.get('/api/sizes', async (req, res) => {
    try {
        // Busca os tamanhos ativos e ordena-os pela ordem lógica (XS, S, M...)
        const [rows] = await pool.query("SELECT * FROM sizes WHERE status = 'active' ORDER BY sort_order ASC");
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar tamanhos.' });
    }
});

// --- ROTA: Criar Produto + Stock Automático ---
app.post('/api/admin/products', authenticateToken, authorizeAdmin, async (req, res) => {
    const { 
        name, ref, description, image_url, price, 
        category_id, collection_id, 
        color_id, initial_stock 
    } = req.body;

    if (!name || !category_id || !price || !ref) {
        return res.status(400).json({ error: 'Preencha os campos obrigatórios (Nome, Referência, Preço, Categoria).' });
    }

    const qty = parseInt(initial_stock) || 0;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [existing] = await connection.query('SELECT id_prod FROM products WHERE ref = ?', [ref]);
        if (existing.length > 0) throw new Error('Já existe um produto com esta Referência.');

        // 1. Inserir Produto
        const [prodResult] = await connection.query(
            'INSERT INTO products (name, ref, description, image_url, id_cat, id_collection) VALUES (?, ?, ?, ?, ?, ?)',
            [name, ref, description || '', image_url || '', category_id, collection_id || null]
        );
        const prodId = prodResult.insertId;

        // 2. Inserir Preço
        await connection.query(
            'INSERT INTO prices (id_prod, price, start_date, status) VALUES (?, ?, NOW(), "active")',
            [prodId, price]
        );

        // 3. Inserir Stock (APENAS se cor e qtd forem fornecidos)
        if (color_id && qty > 0) {
            const [sizes] = await connection.query('SELECT id_size FROM sizes WHERE status = "active"');
            for (const size of sizes) {
                await connection.query(
                    'INSERT INTO stock (id_prod, id_color, id_size, qty) VALUES (?, ?, ?, ?)',
                    [prodId, color_id, size.id_size, qty]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Produto criado com sucesso!', id: prodId });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar produto.' });
    } finally {
        connection.release();
    }
});

// --- ROTA: EDITAR PRODUTO (PUT) ---
app.put('/api/admin/products/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    const { name, ref, description, image_url, price, category_id, collection_id } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Atualizar Dados Básicos
        await connection.query(
            'UPDATE products SET name = ?, ref = ?, description = ?, image_url = ?, id_cat = ?, id_collection = ? WHERE id_prod = ?',
            [name, ref, description, image_url, category_id, collection_id || null, id]
        );

        // 2. Atualizar Preço (Desativa o anterior e cria novo, para histórico)
        const [currentPrice] = await connection.query('SELECT price FROM prices WHERE id_prod = ? AND status = "active"', [id]);
        
        if (currentPrice.length > 0 && parseFloat(currentPrice[0].price) !== parseFloat(price)) {
            // Desativa o antigo
            await connection.query('UPDATE prices SET end_date = NOW(), status = "inactive" WHERE id_prod = ? AND status = "active"', [id]);
            // Cria o novo
            await connection.query('INSERT INTO prices (id_prod, price, start_date, status) VALUES (?, ?, NOW(), "active")', [id, price]);
        }

        await connection.commit();
        res.json({ message: 'Produto atualizado com sucesso!' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
    } finally {
        connection.release();
    }
});

// --- ROTA: DESATIVAR PRODUTO (DELETE) ---
app.delete('/api/admin/products/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('UPDATE prices SET status = "inactive", end_date = NOW() WHERE id_prod = ?', [id]);
        res.json({ message: 'Produto removido da loja.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover produto.' });
    }
});

// --- ROTA: ATUALIZAR QTD DE UMA LINHA DE STOCK ---
app.put('/api/admin/stock/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { qty } = req.body;
    try {
        await pool.query('UPDATE stock SET qty = ? WHERE id_stock = ?', [qty, req.params.id]);
        res.json({ message: 'Atualizado.' });
    } catch (e) { res.status(500).json({ error: 'Erro.' }); }
});

// --- LER STOCK DE UM PRODUTO ---
app.get('/api/admin/products/:id/stock', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.id_stock, s.qty, c.name as color_name, c.id_color, sz.name as size_name, sz.id_size
            FROM stock s
            JOIN colors c ON s.id_color = c.id_color
            JOIN sizes sz ON s.id_size = sz.id_size
            WHERE s.id_prod = ?
            ORDER BY c.name, sz.sort_order
        `, [req.params.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Erro ao ler stock.' }); }
});

// --- ATUALIZAR OU ADICIONAR VARIANTE ---
app.post('/api/admin/stock', authenticateToken, authorizeAdmin, async (req, res) => {
    const { id_prod, id_color, id_size, qty } = req.body;
    
    try {
        // Verifica se a variante já existe para atualizar ou criar
        const [exists] = await pool.query(
            'SELECT id_stock FROM stock WHERE id_prod = ? AND id_color = ? AND id_size = ?',
            [id_prod, id_color, id_size]
        );

        if (exists.length > 0) {
            await pool.query('UPDATE stock SET qty = ? WHERE id_stock = ?', [qty, exists[0].id_stock]);
        } else {
            await pool.query('INSERT INTO stock (id_prod, id_color, id_size, qty) VALUES (?, ?, ?, ?)', 
            [id_prod, id_color, id_size, qty]);
        }
        res.json({ message: 'Stock guardado.' });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: 'Erro ao gravar stock.' }); 
    }
});

// --- ROTA STAFF: DETALHES DE UMA ENCOMENDA ---
app.get('/api/admin/orders/:id', authenticateToken, authorizeStaff, async (req, res) => {
    const orderId = req.params.id;

    try {
        // 1. Buscar Info Geral da Encomenda + Cliente
        const [orderRows] = await pool.query(`
            SELECT o.*, u.name as client_name, u.email as client_email, 
                   u.phone as client_phone, u.tax_id as client_tax_id
            FROM orders o
            JOIN users u ON o.id_user = u.id_user
            WHERE o.id_order = ?
        `, [orderId]);

        if (orderRows.length === 0) return res.status(404).json({ error: 'Encomenda não encontrada.' });
        const order = orderRows[0];

        // 2. Buscar Itens da Encomenda
        const [items] = await pool.query(`
            SELECT oi.qty, oi.price_at_purchase, p.name, p.image_url, 
                   c.name as color_name, s.name as size_name
            FROM order_items oi
            JOIN stock st ON oi.id_stock = st.id_stock
            JOIN products p ON st.id_prod = p.id_prod
            JOIN colors c ON st.id_color = c.id_color
            JOIN sizes s ON st.id_size = s.id_size
            WHERE oi.id_order = ?
        `, [orderId]);

        // 3. Organizar Resposta
        res.json({
            ...order,
            items: items,
            // A morada vem como String JSON da DB, vamos garantir que vai como Objeto
            shipping_address: typeof order.shipping_address === 'string' 
                ? JSON.parse(order.shipping_address) 
                : order.shipping_address
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar detalhes.' });
    }
});

// ==========================================
// ROTAS PÚBLICAS (PRODUTOS, CATEGORIAS)
// =========================================

// --- ROTA: Listar Todos os Produtos ---
app.get('/api/products', async (req, res) => {
    try {
        const category = req.query.category;
        const params = [];
        
        let sql = `
            SELECT p.id_prod as id, p.name, p.description, p.image_url, 
                   pr.price, c.name as category_name,
                   p.id_cat, p.id_collection,
                   GROUP_CONCAT(DISTINCT CONCAT(col.name, ':', col.hex_code) SEPARATOR ',') as variants
            FROM products p
            JOIN prices pr ON p.id_prod = pr.id_prod
            JOIN categories c ON p.id_cat = c.id_cat
            JOIN stock s ON p.id_prod = s.id_prod AND s.qty > 0
            LEFT JOIN colors col ON s.id_color = col.id_color
            WHERE pr.status = 'active' AND pr.end_date IS NULL
        `;

        if (category && category !== 'All') {
            sql += ` AND c.name = ?`;
            params.push(category);
        }

        sql += ` GROUP BY p.id_prod, p.name, p.description, p.image_url, pr.price, c.name, p.id_cat, p.id_collection`;
        
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const [productRows] = await pool.query(`
            SELECT p.id_prod as id, p.name, p.ref, p.description, p.image_url, 
                   pr.price, c.name as category_name,
                   p.id_cat, p.id_collection
            FROM products p
            JOIN prices pr ON p.id_prod = pr.id_prod
            JOIN categories c ON p.id_cat = c.id_cat
            WHERE p.id_prod = ? AND pr.status = 'active' AND pr.end_date IS NULL
        `, [id]);

        if (productRows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        const [stockRows] = await pool.query(`
            SELECT s.id_stock as stock_id,
                   co.id_color as color_id, 
                   co.name as color_name, 
                   co.hex_code,
                   si.id_size as size_id, 
                   si.name as size_name,
                   s.qty
            FROM stock s
            JOIN colors co ON s.id_color = co.id_color
            JOIN sizes si ON s.id_size = si.id_size
            WHERE s.id_prod = ?
            ORDER BY co.id_color, si.sort_order
        `, [id]);

        res.json({
            product: productRows[0],
            stock: stockRows
        });

    } catch (error) {
        console.error("Erro no produto " + id, error);
        res.status(500).json({ error: 'Erro ao buscar detalhes do produto' });
    }
});

// --- ROTA: LISTAR CATEGORIAS ---
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id_cat, name FROM categories WHERE status = 'active'");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// --- ROTA: Listar Produtos para ADMIN ---
app.get('/api/admin/products-list', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.id_prod as id, 
                   p.name, 
                   p.ref,
                   p.description,
                   p.image_url, 
                   pr.price, pr.status, c.name as category_name,
                   p.id_cat, p.id_collection,
                   COALESCE(SUM(s.qty), 0) as total_stock
            FROM products p
            JOIN prices pr ON p.id_prod = pr.id_prod
            JOIN categories c ON p.id_cat = c.id_cat
            LEFT JOIN stock s ON p.id_prod = s.id_prod
            WHERE pr.end_date IS NULL
            GROUP BY p.id_prod, p.name, p.ref, p.description, p.image_url, pr.price, pr.status, c.name, p.id_cat, p.id_collection
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar produtos admin.' });
    }
});

// --- ROTA: Alternar Estado (Ativar/Desativar) ---
app.put('/api/admin/products/:id/toggle', authenticateToken, authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        // Verifica o estado atual
        const [rows] = await pool.query('SELECT status FROM prices WHERE id_prod = ? AND end_date IS NULL', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado.' });
        
        const newStatus = rows[0].status === 'active' ? 'inactive' : 'active';
        
        // Atualiza
        await pool.query('UPDATE prices SET status = ? WHERE id_prod = ? AND end_date IS NULL', [newStatus, id]);
        
        res.json({ message: `Produto ${newStatus === 'active' ? 'ativado' : 'desativado'}.` });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao alterar estado.' });
    }
});

// ==========================================
// ROTAS PROTEGIDAS (PERFIL DO UTILIZADOR)
// ==========================================

// --- ROTA: LER Perfil Completo ---
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT name, email, tax_id, phone, 
                   address_line_1, address_line_2, city, 
                   state_province, postal_code, country_code 
            FROM users 
            WHERE id_user = ?
        `;
        const [rows] = await pool.query(sql, [req.user.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Utilizador não encontrado' });
        
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// --- ROTA: ATUALIZAR Dados Pessoais ---
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    const { 
        name, tax_id, phone, 
        address_line_1, address_line_2, 
        city, state_province, postal_code, country_code 
    } = req.body;

    const connection = await pool.getConnection();

    try {
        // 1. VERIFICA DUPLICIDADE DE NIF
        if (tax_id) {
            // Procura se existe ALGUM user com este NIF que NÃO SEJA o próprio (id_user != req.user.id)
            const [existing] = await connection.query(
                'SELECT id_user FROM users WHERE tax_id = ? AND id_user != ?', 
                [tax_id, req.user.id]
            );

            if (existing.length > 0) {
                connection.release();
                return res.status(409).json({ error: 'Este CPF já está associado a outra conta.' });
            }
        }

        // 2. ATUALIZA
        const sql = `
            UPDATE users SET 
                name = ?, tax_id = ?, phone = ?,
                address_line_1 = ?, address_line_2 = ?,
                city = ?, state_province = ?, postal_code = ?, country_code = ?
            WHERE id_user = ?
        `;

        await connection.query(sql, [
            name, tax_id, phone,
            address_line_1, address_line_2,
            city, state_province, postal_code, country_code,
            req.user.id
        ]);

        res.json({ message: 'Perfil atualizado com sucesso!' });

    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
             res.status(409).json({ error: 'Dados duplicados.' });
        } else {
             res.status(500).json({ error: 'Erro ao atualizar perfil' });
        }
    } finally {
        connection.release();
    }
});

// --- ROTA: MUDAR PASSWORD ---
app.put('/api/user/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Preencha a password atual e a nova.' });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({ error: 'A nova password não pode ser igual à atual.' });
    }

    if (!isPasswordStrong(newPassword)) {
         return res.status(400).json({ 
            error: 'A nova password não cumpre os requisitos de segurança.' 
        });
    }

    try {
        // 1. Busca a hash atual na DB
        const [rows] = await pool.query(
            'SELECT password_hash FROM user_auth WHERE id_user = ?', 
            [req.user.id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Utilizador não encontrado.' });

        // 2. Verifica se a password atual está correta
        const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!match) {
            return res.status(401).json({ error: 'A password atual está incorreta.' });
        }

        // 3. Encripta a NOVA password
        const saltRounds = 10;
        const newHash = await bcrypt.hash(newPassword, saltRounds);

        // 4. Guarda na DB
        await pool.query(
            'UPDATE user_auth SET password_hash = ? WHERE id_user = ?',
            [newHash, req.user.id]
        );

        res.json({ message: 'Password alterada com sucesso!' });

    } catch (error) {
        console.error('Erro ao mudar password:', error);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

// --- ROTA: OBTER HISTÓRICO DE ENCOMENDAS ---
app.get('/api/user/orders', authenticateToken, async (req, res) => {
    try {
        // 1. Busca as encomendas do utilizador
        const [orders] = await pool.query(`
            SELECT id_order, total_amount, status, created_at, shipping_cost, id_shipping_method
            FROM orders
            WHERE id_user = ?
            ORDER BY created_at DESC
        `, [req.user.id]);

        // 2. Busca os produtos de cada encomenda
        for (let order of orders) {
            const [items] = await pool.query(`
                SELECT oi.qty, oi.price_at_purchase, p.name, p.image_url, 
                       c.name as color_name, s.name as size_name
                FROM order_items oi
                JOIN stock st ON oi.id_stock = st.id_stock
                JOIN products p ON st.id_prod = p.id_prod
                JOIN colors c ON st.id_color = c.id_color
                JOIN sizes s ON st.id_size = s.id_size
                WHERE oi.id_order = ?
            `, [order.id_order]);
            order.items = items;
        }

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
});

// ==========================================
// ROTAS DO CARRINHO (Base de Dados)
// ==========================================

// Função Auxiliar: Obter ou Criar o ID do Carrinho do User
async function getUserCartId(userId, connection) {
    // 1. Tenta encontrar carrinho existente
    const [rows] = await connection.query('SELECT id_cart FROM carts WHERE id_user = ?', [userId]);
    if (rows.length > 0) return rows[0].id_cart;

    // 2. Se não existe, cria um
    const [result] = await connection.query('INSERT INTO carts (id_user) VALUES (?)', [userId]);
    return result.insertId;
}

// --- ROTA: VER CARRINHO ---
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT 
                ci.id_cart_item, ci.qty,
                p.id_prod, p.name, p.image_url, 
                pr.price,
                c.id_color, c.name as color_name, 
                s.id_size, s.name as size_name,
                st.id_stock
            FROM carts cart
            JOIN cart_items ci ON cart.id_cart = ci.id_cart
            JOIN stock st ON ci.id_stock = st.id_stock
            JOIN products p ON st.id_prod = p.id_prod
            JOIN prices pr ON p.id_prod = pr.id_prod
            JOIN colors c ON st.id_color = c.id_color
            JOIN sizes s ON st.id_size = s.id_size
            WHERE cart.id_user = ? 
              AND pr.status = 'active' AND pr.end_date IS NULL
        `;

        const [items] = await pool.query(sql, [req.user.id]);
        res.json(items);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar carrinho.' });
    }
});

// --- ROTA: ADICIONAR AO CARRINHO ---
app.post('/api/cart', authenticateToken, async (req, res) => {
    const { productId, colorId, sizeId, qty } = req.body;
    const quantity = parseInt(qty) || 1;

    const connection = await pool.getConnection();

    try {
        // 1. Encontrar o ID_STOCK correspondente à variante (Prod + Cor + Tamanho)
        const [stockRows] = await connection.query(
            'SELECT id_stock FROM stock WHERE id_prod = ? AND id_color = ? AND id_size = ?',
            [productId, colorId, sizeId]
        );

        if (stockRows.length === 0) {
            return res.status(404).json({ error: 'Variante não encontrada ou indisponível.' });
        }
        const stockId = stockRows[0].id_stock;

        // 2. Obter ID do Carrinho
        const cartId = await getUserCartId(req.user.id, connection);

        // 3. Verifica se o item já está no carrinho
        const [existing] = await connection.query(
            'SELECT id_cart_item, qty FROM cart_items WHERE id_cart = ? AND id_stock = ?',
            [cartId, stockId]
        );

        if (existing.length > 0) {
            // ATUALIZA: Soma a quantidade
            await connection.query(
                'UPDATE cart_items SET qty = qty + ? WHERE id_cart_item = ?',
                [quantity, existing[0].id_cart_item]
            );
        } else {
            // INSERE: Novo item
            await connection.query(
                'INSERT INTO cart_items (id_cart, id_stock, qty) VALUES (?, ?, ?)',
                [cartId, stockId, quantity]
            );
        }

        res.json({ message: 'Produto adicionado!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao adicionar ao carrinho.' });
    } finally {
        connection.release();
    }
});

// --- ROTA: ATUALIZAR QUANTIDADE ---
app.put('/api/cart/item/:id', authenticateToken, async (req, res) => {
    const idCartItem = req.params.id;
    const { qty } = req.body;

    if (qty < 1) return res.status(400).json({ error: 'Qtd inválida' });

    try {
        // Garante que o item pertence ao user logado (Segurança)
        await pool.query(`
            UPDATE cart_items ci
            JOIN carts c ON ci.id_cart = c.id_cart
            SET ci.qty = ?
            WHERE ci.id_cart_item = ? AND c.id_user = ?
        `, [qty, idCartItem, req.user.id]);

        res.json({ message: 'Atualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar.' });
    }
});

// --- ROTA: REMOVER ITEM ---
app.delete('/api/cart/item/:id', authenticateToken, async (req, res) => {
    const idCartItem = req.params.id;
    try {
        await pool.query(`
            DELETE ci FROM cart_items ci
            JOIN carts c ON ci.id_cart = c.id_cart
            WHERE ci.id_cart_item = ? AND c.id_user = ?
        `, [idCartItem, req.user.id]);

        res.json({ message: 'Removido' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao remover.' });
    }
});

// ==========================================
// AUTENTICAÇÃO (Sign Up & Sign In)
// ==========================================

// --- ROTA AUXILIAR: Verificar se Email existe ---
app.post('/api/auth/check-email', async (req, res) => {
    const { email } = req.body;
    try {
        const [rows] = await pool.query('SELECT id_user FROM users WHERE email = ?', [email]);
        // Retorna true se existir, false se não
        res.json({ exists: rows.length > 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao verificar email' });
    }
});

// --- ROTA AUXILIAR: Verificar se NIF/Tax ID existe ---
app.post('/api/auth/check-tax', async (req, res) => {
    const { tax_id } = req.body;
    try {
        const [rows] = await pool.query('SELECT id_user FROM users WHERE tax_id = ?', [tax_id]);
        res.json({ exists: rows.length > 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao verificar NIF' });
    }
});

// --- ROTA: LISTAR PAÍSES ---
app.get('/api/countries', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT iso_code, name, phone_code, allows_shipping FROM countries ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar países' });
    }
});

// --- ROTA: REGISTO (Sign Up) ---
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, tax_id } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e password são obrigatórios.' });
    }

    // Validação correta de 12 caracteres
    if (!isPasswordStrong(password)) {
        return res.status(400).json({ 
            error: 'A password deve ter pelo menos 12 caracteres, uma maiúscula, um número e um símbolo.' 
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Verifica se o email já existe
        const [existing] = await connection.query('SELECT id_user FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Este email já está registado.' });
        }

        // Verifica se o CPF já existe
        const [existingTax] = await connection.query('SELECT id_user FROM users WHERE tax_id = ?', [tax_id]);
        if (existingTax.length > 0) {
            return res.status(409).json({ error: 'Este CPF já está associado a outra conta.' });
        }

        // Encripta a password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Cria o Utilizador na tabela USERS
        const [userResult] = await connection.query(
            'INSERT INTO users (name, email, tax_id) VALUES (?, ?, ?)',
            [name, email, tax_id]
        );
        const userId = userResult.insertId;

        // Cria a entrada de Segurança na tabela USER_AUTH
        await connection.query(
            'INSERT INTO user_auth (id_user, password_hash) VALUES (?, ?)',
            [userId, passwordHash]
        );

        await connection.commit();

        res.status(201).json({ message: 'Utilizador registado com sucesso!' });

    } catch (error) {
        await connection.rollback();
        console.error('Erro no registo:', error);

        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ error: 'Dados duplicados (Email ou NIF já existem).' });
        }

        res.status(500).json({ error: 'Erro ao registar utilizador.' });
    } finally {
        connection.release();
    }
});

// --- ROTA: LOGIN (Sign In) ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e password são obrigatórios.' });
    }

    try {
        // Busca o utilizador e a hash da password
        const [users] = await pool.query(`
            SELECT u.id_user, u.name, u.email, u.role, ua.password_hash 
            FROM users u
            JOIN user_auth ua ON u.id_user = ua.id_user
            WHERE u.email = ? AND ua.status = 'active'
        `, [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Email ou password incorretos.' });
        }

        const user = users[0];

        // Compara a password que o utilizador escreveu com a Hash guardada
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ error: 'Email ou password incorretos.' });
        }

        // Gera o Token JWT
        const token = jwt.sign(
            { 
                id: user.id_user, 
                name: user.name, 
                role: user.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' } // Login expira em 24 horas
        );

        // Envia sucesso + dados básicos + token
        res.json({
            message: 'Login efetuado com sucesso',
            token: token,
            user: {
                id: user.id_user,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login.' });
    }
});

// --- ROTA: PEDIR RESET (Esqueci-me da password) ---
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

    try {
        // 1. Verifica se o user existe
        const [users] = await pool.query('SELECT id_user FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.json({ message: 'Se o email existir, receberás um link de recuperação.' });
        }
        
        const userId = users[0].id_user;

        // 2. Gera um Token Aleatório
        const token = crypto.randomBytes(20).toString('hex');
        
        // 3. Define Expiração (1 hora a partir de agora)
        const expireDate = new Date(Date.now() + 3600000); // + 1 hora em milissegundos

        // 4. Guarda na BD
        await pool.query(
            'UPDATE user_auth SET reset_token = ?, reset_expires = ? WHERE id_user = ?',
            [token, expireDate, userId]
        );

        // 5. "ENVIA EMAIL"
        const resetLink = `${process.env.BASE_URL}reset-password.html?token=${token}`;
        
        console.log('================================================');
        console.log('🔗 LINK DE RECUPERAÇÃO (SIMULAÇÃO DE EMAIL):');
        console.log(resetLink);
        console.log('================================================');

        res.json({ message: 'Se o email existir, receberás um link de recuperação.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar pedido.' });
    }
});

// --- ROTA: EFETUAR RESET (Gravar nova password) ---
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) return res.status(400).json({ error: 'Dados em falta.' });

    // Validação de força da password
    if (!isPasswordStrong(newPassword)) {
        return res.status(400).json({ 
            error: 'A password deve ter pelo menos 12 caracteres, uma maiúscula, um número e um símbolo.' 
        });
    }

    try {
        // 1. Procura user com este token E traz também a password antiga (hash)
        const [rows] = await pool.query(
            'SELECT id_user, password_hash FROM user_auth WHERE reset_token = ? AND reset_expires > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Link inválido ou expirado.' });
        }

        const userAuth = rows[0];

        // 2. A nova password é igual à antiga?
        const isSamePassword = await bcrypt.compare(newPassword, userAuth.password_hash);
        
        if (isSamePassword) {
            return res.status(400).json({ error: 'A nova password não pode ser igual à antiga.' });
        }

        // 3. Se passou, encripta a nova password
        const saltRounds = 10;
        const newHash = await bcrypt.hash(newPassword, saltRounds);

        // 4. Atualiza a password e LIMPA o token
        await pool.query(
            'UPDATE user_auth SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id_user = ?',
            [newHash, userAuth.id_user]
        );

        res.json({ message: 'Password alterada com sucesso! Podes fazer login.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao redefinir password.' });
    }
});

// ==========================================
// ROTAS DE CHECKOUT E ENCOMENDAS
// ==========================================

// --- ROTA: LISTAR MÉTODOS DE ENVIO (Por País) ---
app.get('/api/shipping-methods', async (req, res) => {
    const countryCode = req.query.country;

    try {
        let sql = "SELECT * FROM shipping_methods WHERE status = 'active'";
        let params = [];

        if (countryCode) {
            sql = `
                SELECT DISTINCT sm.id_shipping_method, sm.name, sr.price, sm.estimated_days 
                FROM shipping_methods sm
                JOIN shipping_rates sr ON sm.id_shipping_method = sr.id_shipping_method
                JOIN shipping_zones sz ON sr.id_zone = sz.id_zone
                JOIN country_zones cz ON sz.id_zone = cz.id_zone
                WHERE cz.country_code = ? AND sm.status = 'active'
            `;
            params = [countryCode];
        }

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar métodos de envio.' });
    }
});

// --- ROTA: CRIAR ENCOMENDA (Checkout) ---
app.post('/api/orders', authenticateToken, async (req, res) => {
    const { shippingMethodId, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;

    // Extrair o país de destino para calcular o frete corretamente
    const destCountryCode = shippingAddress.country;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obter itens do carrinho
        const [cartItems] = await connection.query(`
            SELECT ci.id_stock, ci.qty, p.name, pr.price
            FROM cart_items ci
            JOIN carts c ON ci.id_cart = c.id_cart
            JOIN stock s ON ci.id_stock = s.id_stock
            JOIN products p ON s.id_prod = p.id_prod
            JOIN prices pr ON p.id_prod = pr.id_prod
            WHERE c.id_user = ? AND pr.status = 'active' AND pr.end_date IS NULL
        `, [userId]);

        if (cartItems.length === 0) throw new Error('O carrinho está vazio.');

        // 2. Calcular Totais e Verificar Stock
        let productsTotal = 0;

        for (const item of cartItems) {
            const [stockRow] = await connection.query(
                'SELECT qty FROM stock WHERE id_stock = ? FOR UPDATE', 
                [item.id_stock]
            );

            if (stockRow.length === 0 || stockRow[0].qty < item.qty) {
                throw new Error(`Stock insuficiente para: ${item.name}`);
            }
            productsTotal += parseFloat(item.price) * item.qty;
        }

        // 3. CALCULAR CUSTO DE ENVIO
        // Busca o preço na tabela RATES baseado no PAÍS e MÉTODO
        const [rateRows] = await connection.query(`
            SELECT sr.price 
            FROM shipping_rates sr
            JOIN country_zones cz ON sr.id_zone = cz.id_zone
            WHERE cz.country_code = ? AND sr.id_shipping_method = ?
        `, [destCountryCode, shippingMethodId]);

        if (rateRows.length === 0) throw new Error('Método de envio inválido para este país.');
        
        const shippingCost = parseFloat(rateRows[0].price);
        
        // Custos Adicionais
        const operationCost = 10.00; 
        
        const finalTotal = productsTotal + shippingCost + operationCost;

        // 4. CRIAR A ENCOMENDA
        const addressString = JSON.stringify(shippingAddress);
        const [orderResult] = await connection.query(`
            INSERT INTO orders 
            (id_user, total_amount, id_shipping_method, shipping_address, shipping_cost, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `, [userId, finalTotal, shippingMethodId, addressString, shippingCost]);
        
        const orderId = orderResult.insertId;

        // 5. REGISTAR PAGAMENTO
        await connection.query(`
            INSERT INTO payments (id_order, payment_method, amount, status)
            VALUES (?, ?, ?, 'completed')
        `, [orderId, paymentMethod || 'credit_card', finalTotal]);

        // 6. MOVER ITENS e ABATER STOCK
        for (const item of cartItems) {
            await connection.query(`
                INSERT INTO order_items (id_order, id_stock, qty, price_at_purchase)
                VALUES (?, ?, ?, ?)
            `, [orderId, item.id_stock, item.qty, item.price]);

            await connection.query(`
                UPDATE stock SET qty = qty - ? WHERE id_stock = ?
            `, [item.qty, item.id_stock]);
        }

        // 7. LIMPAR CARRINHO
        const [cartRow] = await connection.query('SELECT id_cart FROM carts WHERE id_user = ?', [userId]);
        if (cartRow.length > 0) {
            await connection.query('DELETE FROM cart_items WHERE id_cart = ?', [cartRow[0].id_cart]);
        }

        await connection.commit();
        res.status(201).json({ message: 'Sucesso!', orderId: orderId });

    } catch (error) {
        await connection.rollback();
        console.error('Erro no checkout:', error);
        res.status(400).json({ error: error.message || 'Erro ao processar encomenda.' });
    } finally {
        connection.release();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr na porta ${PORT}`);
});