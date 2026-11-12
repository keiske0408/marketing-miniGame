interface AvatarProps {
  name: string;
  isGuest?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, isGuest = false, size = 'md', className = '' }: AvatarProps) {
  const getInitials = (str: string) => {
    const parts = str.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) {
      const single = parts[0];
      return single.length >= 2
        ? single.substring(0, 2).toUpperCase()
        : single.toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      className={`avatar avatar-${size} ${isGuest ? 'avatar-guest' : ''} ${className}`}
      aria-label={`Player avatar for ${name}`}
      title={name}
    >
      <span className="avatar-initials">{getInitials(name)}</span>
    </div>
  );
}

