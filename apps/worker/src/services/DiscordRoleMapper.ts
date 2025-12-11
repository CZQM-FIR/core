/**
 * Discord Role Mapper
 * Following SRP: Only handles mapping user data to Discord roles
 * Following OCP: Role mappings are configured via constants
 */

import { RATING_ROLE_MAP, FLAG_ROLE_MAP, MANAGED_DISCORD_ROLES } from '@czqm/common/constants';

interface GuildRole {
  id: string;
  name: string;
}

interface UserFlag {
  flag: {
    name: string;
  };
}

interface UserRating {
  short: string;
}

interface UserData {
  name_full: string;
  ratingID: number;
  rating: UserRating;
  flags: UserFlag[];
}

export class DiscordRoleMapper {
  constructor(private readonly guildRoles: GuildRole[]) {}

  /**
   * Get all role IDs that should be assigned to a user
   */
  getRolesForUser(user: UserData, existingRoles: string[]): string[] {
    const roles: string[] = [];

    // Add rating role
    const ratingRole = this.getRatingRole(user.rating.short);
    if (ratingRole) roles.push(ratingRole);

    // Add flag roles
    for (const flag of user.flags) {
      const flagRole = this.getFlagRole(flag.flag.name);
      if (flagRole) roles.push(flagRole);
    }

    // Add student role if applicable
    if (this.shouldHaveStudentRole(user)) {
      const studentRole = this.findRoleByName('Student');
      if (studentRole) roles.push(studentRole);
    }

    // Add guest role if not a controller or visitor
    if (!this.isMember(user)) {
      const guestRole = this.findRoleByName('Guest');
      if (guestRole) roles.push(guestRole);
    }

    // Preserve non-managed roles
    const nonManagedRoles = this.getNonManagedRoles(existingRoles);
    roles.push(...nonManagedRoles);

    return roles;
  }

  /**
   * Get roles for an unlinked member (remove all managed roles)
   */
  getRolesForUnlinkedMember(existingRoles: string[]): string[] {
    return this.getNonManagedRoles(existingRoles);
  }

  private getRatingRole(ratingShort: string): string | undefined {
    const roleName = RATING_ROLE_MAP[ratingShort];
    return roleName ? this.findRoleByName(roleName) : undefined;
  }

  private getFlagRole(flagName: string): string | undefined {
    const roleName = FLAG_ROLE_MAP[flagName];
    return roleName ? this.findRoleByName(roleName) : undefined;
  }

  private findRoleByName(name: string): string | undefined {
    return this.guildRoles.find((r) => r.name === name)?.id;
  }

  private shouldHaveStudentRole(user: UserData): boolean {
    const hasControllerFlag = user.flags.some((f) => f.flag.name === 'controller');
    const isStudent = user.ratingID >= 2 && user.ratingID <= 4;
    return hasControllerFlag && isStudent;
  }

  private isMember(user: UserData): boolean {
    return user.flags.some((f) => ['controller', 'visitor'].includes(f.flag.name));
  }

  private getNonManagedRoles(roleIds: string[]): string[] {
    return roleIds.filter((roleId) => {
      const role = this.guildRoles.find((r) => r.id === roleId);
      return role && !MANAGED_DISCORD_ROLES.includes(role.name);
    });
  }
}
