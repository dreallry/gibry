import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#fffcf8] group-[.toaster]:text-[#4a3f35] group-[.toaster]:border-[#dbd0ba] group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:font-sans",
          description: "group-[.toast]:text-[#7d6b56] group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-[#8c6d48] group-[.toast]:text-white group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:font-bold",
          cancelButton:
            "group-[.toast]:bg-[#ede5d8] group-[.toast]:text-[#4a3f35] group-[.toast]:rounded-xl group-[.toast]:text-xs",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
