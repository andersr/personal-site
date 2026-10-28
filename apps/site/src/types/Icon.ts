export type IconProps = {
  /**
   *  Icon names: https://icon-sets.iconify.design/
   */
  icon: string;
  twColor?: string;
  title?: string;
  size?: number;
};

export interface IconLinkProps extends IconProps {
  href: string;
}
