import React from 'react';
import { Puck } from '@measured/puck';
import '@measured/puck/styles.css';
import type { Config, Data } from '@measured/puck';

type ComponentProps = {
  HeroBanner: {
    title: string;
    subtitle: string;
    backgroundImage: string;
    ctaText: string;
    ctaLink: string;
    alignment: 'left' | 'center' | 'right';
  };
  ProductGrid: {
    title: string;
    limit: number;
    columns: 2 | 3 | 4;
    categoryId?: string;
  };
  WhatsAppButton: {
    phoneNumber: string;
    message: string;
    buttonText: string;
    position: 'bottom-right' | 'bottom-left';
  };
  SectionContainer: {
    backgroundColor: string;
    paddingY: 'small' | 'medium' | 'large';
    children?: React.ReactNode;
  };
};

const puckConfig: Config<ComponentProps> = {
  components: {
    HeroBanner: {
      fields: {
        title: { type: 'text' },
        subtitle: { type: 'textarea' },
        backgroundImage: { type: 'text' },
        ctaText: { type: 'text' },
        ctaLink: { type: 'text' },
        alignment: {
          type: 'radio',
          options: [
            { label: 'Esquerda', value: 'left' },
            { label: 'Centro', value: 'center' },
            { label: 'Direita', value: 'right' },
          ],
        },
      },
      defaultProps: {
        title: 'Novidades Exclusivas na Loja',
        subtitle: 'Confira nossa seleção especial de produtos para você.',
        backgroundImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
        ctaText: 'Ver Produtos',
        ctaLink: '/products',
        alignment: 'center',
      },
      render: ({ title, subtitle, backgroundImage, ctaText, ctaLink, alignment }) => {
        const alignClasses = {
          left: 'text-left items-start',
          center: 'text-center items-center',
          right: 'text-right items-end',
        }[alignment];

        return (
          <div
            className="relative w-full py-24 px-6 bg-cover bg-center flex flex-col justify-center text-white"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${backgroundImage})`,
            }}
          >
            <div className={`max-w-4xl mx-auto flex flex-col ${alignClasses}`}>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{title}</h1>
              <p className="text-lg md:text-xl mb-8 max-w-2xl opacity-90">{subtitle}</p>
              {ctaText && (
                <a
                  href={ctaLink}
                  className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg shadow hover:bg-gray-100 transition"
                >
                  {ctaText}
                </a>
              )}
            </div>
          </div>
        );
      },
    },
    ProductGrid: {
      fields: {
        title: { type: 'text' },
        limit: { type: 'number' },
        columns: {
          type: 'select',
          options: [
            { label: '2 Colunas', value: 2 },
            { label: '3 Colunas', value: 3 },
            { label: '4 Colunas', value: 4 },
          ],
        },
        categoryId: { type: 'text' },
      },
      defaultProps: {
        title: 'Produtos em Destaque',
        limit: 8,
        columns: 4,
      },
      render: ({ title, limit, columns }) => {
        const gridColsClass = {
          2: 'grid-cols-1 sm:grid-cols-2',
          3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
          4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
        }[columns];

        return (
          <section className="py-12 px-6 max-w-7xl mx-auto">
            {title && <h2 className="text-2xl font-bold mb-8 text-gray-900">{title}</h2>}
            <div className={`grid ${gridColsClass} gap-6`}>
              {Array.from({ length: Math.min(limit || 8, 24) }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                >
                  <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                    Imagem
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800">Produto {index + 1}</h3>
                    <p className="text-lg font-bold text-gray-900 mt-2">R$ 99,90</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      },
    },
    WhatsAppButton: {
      fields: {
        phoneNumber: { type: 'text' },
        message: { type: 'textarea' },
        buttonText: { type: 'text' },
        position: {
          type: 'radio',
          options: [
            { label: 'Direito', value: 'bottom-right' },
            { label: 'Esquerdo', value: 'bottom-left' },
          ],
        },
      },
      defaultProps: {
        phoneNumber: '5516991222972',
        message: 'Olá!',
        buttonText: 'WhatsApp',
        position: 'bottom-right',
      },
      render: ({ phoneNumber, message, buttonText, position }) => {
        const posClass = position === 'bottom-right' ? 'right-6' : 'left-6';

        return (
          <div className={`fixed bottom-6 ${posClass} z-50`}>
            <a
              href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-3 rounded-full shadow-lg transition"
            >
              💬 {buttonText}
            </a>
          </div>
        );
      },
    },
    SectionContainer: {
      fields: {
        backgroundColor: {
          type: 'select',
          options: [
            { label: 'Branco', value: '#ffffff' },
            { label: 'Cinza', value: '#f9fafb' },
          ],
        },
        paddingY: {
          type: 'select',
          options: [
            { label: 'Médio', value: 'medium' },
            { label: 'Grande', value: 'large' },
          ],
        },
      },
      dropZones: {
        children: {
          allowed: ['HeroBanner', 'ProductGrid'],
        },
      },
      defaultProps: {
        backgroundColor: '#ffffff',
        paddingY: 'medium',
      },
      render: ({ backgroundColor, paddingY, children }) => {
        const py = paddingY === 'large' ? 'py-20' : 'py-12';
        return <div style={{ backgroundColor }} className={`w-full ${py}`}>{children}</div>;
      },
    },
  },
};

type PuckEditorProps = {
  data?: Data;
  onPublish?: (data: Data) => void;
};

export function PuckEditor({ data, onPublish }: PuckEditorProps) {
  return (
    <Puck
      config={puckConfig}
      data={data ?? { content: [] }}
      onPublish={onPublish ?? (() => undefined)}
    />
  );
}
