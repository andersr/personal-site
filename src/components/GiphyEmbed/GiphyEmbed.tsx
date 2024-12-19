// import { useWindowSize, WindowProps } from "~/hooks";

import {
  useWindowSize,
  type WindowProps,
} from "~/lib/useWindowSize/useWindowSize";

interface Props {
  src: string;
  href: string;
}

export function GiphyEmbed({ src, href }: Props) {
  const DEFAULT_SIZE: WindowProps = { width: 480, height: 480 };

  const currentWindowSize = useWindowSize();

  const imgSize: WindowProps =
    typeof window !== "undefined"
      ? {
          width:
            currentWindowSize.width < DEFAULT_SIZE.width
              ? currentWindowSize.width
              : DEFAULT_SIZE.width,
          height: DEFAULT_SIZE.height,
        }
      : DEFAULT_SIZE;
  return (
    <div className="max-w-full md:max-w-md mx-auto">
      <iframe
        src={src}
        width={imgSize.width.toString()}
        height={imgSize.height.toString()}
        frameBorder="0"
        className="giphy-embed"
      ></iframe>
      <p className="m-0">
        <a className="text-slate-400 text-sm" href={href}>
          via GIPHY
        </a>
      </p>
    </div>
  );
}
