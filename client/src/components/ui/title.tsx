import React from "react";

interface TitleProps {
  title: string;
  subtitle?: string;
}

const Title: React.FC<TitleProps> = ({ title, subtitle }) => {
  return (
    <div className="text-center py-10">
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="h-[1px] w-6 bg-primary-400 opacity-70"></span>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-widest uppercase text-primary-700 dark:text-primary-200">
          {title}
        </h1>
        <span className="h-[1px] w-6 bg-primary-400 opacity-70"></span>
      </div>

      {subtitle && (
        <p className="text-sm text-primary-400 dark:text-primary-300 italic tracking-wide">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default Title;
