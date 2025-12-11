/**
 * Controller de usuários
 * Gerencia operações relacionadas a usuários (clientes e gestores)
 * Nota: Para operações de CRUD de clientes, use o ClientController
 */
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

class UserController {
  /**
   * Listar clientes do gestor
   * @deprecated Use ClientController.list ao invés deste método
   */
  async listClients(req, res) {
    try {
      if (req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Acesso restrito a gestores' });
      }

      const { page = 1, limit = 20, search, isActive } = req.query;
      const skip = (page - 1) * limit;

      // Monta o filtro de busca
      const where = {
        managerId: req.userId,
        ...(search && {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } }
          ]
        }),
        ...(isActive !== undefined && { isActive: isActive === 'true' })
      };

      // Busca clientes com Prisma
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            },
            _count: {
              select: { campaigns: true }
            }
          },
          orderBy: { companyName: 'asc' },
          skip: parseInt(skip),
          take: parseInt(limit)
        }),
        prisma.client.count({ where })
      ]);

      res.json({
        clients: clients.map(c => ({
          ...c,
          campaignCount: c._count.campaigns
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obter cliente por ID
   * @deprecated Use ClientController.getById ao invés deste método
   */
  async getClient(req, res) {
    try {
      const { clientId } = req.params;

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          campaigns: {
            select: {
              id: true,
              name: true,
              status: true,
              budgetDaily: true,
              targetRoas: true
            }
          }
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Verificar permissão
      if (req.user.role === 'CLIENT' && client.userId !== req.userId) {
        return res.status(403).json({ error: 'Sem permissão' });
      }

      if (req.user.role === 'MANAGER' && client.managerId !== req.userId) {
        return res.status(403).json({ error: 'Sem permissão' });
      }

      res.json(client);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Criar cliente (gestor criando)
   * @deprecated Use ClientController.create ao invés deste método
   */
  async createClient(req, res) {
    try {
      if (req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Acesso restrito a gestores' });
      }

      const { email, password, name, company, phone, googleAdsCustomerId } = req.body;

      // Verificar se email já existe
      const existing = await prisma.user.findUnique({
        where: { email }
      });

      if (existing) {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Criar usuário e cliente em uma transação
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name,
            role: 'CLIENT',
            company,
            managerId: req.userId
          }
        });

        const client = await tx.client.create({
          data: {
            userId: user.id,
            managerId: req.userId,
            companyName: company,
            googleAdsCustomerId
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        });

        return client;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Atualizar cliente
   * @deprecated Use ClientController.update ao invés deste método
   */
  async updateClient(req, res) {
    try {
      const { clientId } = req.params;
      const { name, company, phone, googleAdsCustomerId, isActive } = req.body;

      // Buscar cliente
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Verificar permissão
      if (req.user.role === 'MANAGER' && client.managerId !== req.userId) {
        return res.status(403).json({ error: 'Sem permissão' });
      } else if (req.user.role === 'CLIENT' && client.userId !== req.userId) {
        return res.status(403).json({ error: 'Sem permissão' });
      }

      // Atualizar cliente
      const updated = await prisma.client.update({
        where: { id: clientId },
        data: {
          ...(company && { companyName: company }),
          ...(googleAdsCustomerId && { googleAdsCustomerId }),
          ...(isActive !== undefined && { isActive })
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      // Atualizar dados do usuário se fornecidos
      if (name || phone) {
        await prisma.user.update({
          where: { id: client.userId },
          data: {
            ...(name && { name }),
            ...(phone && { phone })
          }
        });
      }

      res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Desativar cliente
   * @deprecated Use ClientController.remove ao invés deste método
   */
  async deactivateClient(req, res) {
    try {
      const { clientId } = req.params;

      if (req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Acesso restrito a gestores' });
      }

      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      if (client.managerId !== req.userId) {
        return res.status(403).json({ error: 'Sem permissão' });
      }

      await prisma.client.update({
        where: { id: clientId },
        data: { isActive: false }
      });

      res.json({ success: true, message: 'Cliente desativado' });
    } catch (error) {
      console.error('Erro ao desativar cliente:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Buscar gestor do cliente logado
   * Retorna informações do gestor responsável pelo cliente
   */
  async getManager(req, res) {
    try {
      if (req.user.role !== 'CLIENT') {
        return res.status(403).json({ error: 'Apenas clientes podem buscar seu gestor' });
      }

      // Buscar o cliente do usuário logado
      const client = await prisma.client.findFirst({
        where: { userId: req.userId },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true
            }
          }
        }
      });

      if (!client || !client.manager) {
        return res.status(404).json({ error: 'Gestor não encontrado' });
      }

      res.json(client.manager);
    } catch (error) {
      console.error('Erro ao buscar gestor:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new UserController();
