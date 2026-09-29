import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@saas/database';
import { INDUSTRY_BLUEPRINTS } from '@saas/shared-types';

export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';

  /**
   * Registers a new tenant organization and its owner.
   */
  async register(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    industryBlueprint?: string;
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: params.email },
    });

    if (existingUser) {
      throw new Error('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const slug = params.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 6);

    const blueprint = params.industryBlueprint && INDUSTRY_BLUEPRINTS[params.industryBlueprint]
      ? INDUSTRY_BLUEPRINTS[params.industryBlueprint]
      : null;

    // Create user, tenant, and membership in transaction
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: params.email,
          passwordHash,
          firstName: params.firstName,
          lastName: params.lastName,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: params.organizationName,
          slug,
          settings: blueprint
            ? {
                industry: blueprint.id,
                systemPrompt: blueprint.defaultPrompt,
                enabledTools: blueprint.enabledTools,
              }
            : {},
        },
      });

      await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      };
    });
  }

  /**
   * Authenticates user and returns active tenant memberships.
   */
  async login(params: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: params.email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isValidPassword = await bcrypt.compare(params.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password.');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      this.jwtSecret,
      { expiresIn: '7d' }
    );

    const tenants = user.memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: m.role,
    }));

    return {
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      tenants,
    };
  }
}
