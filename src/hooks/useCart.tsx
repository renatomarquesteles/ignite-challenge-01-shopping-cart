import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const updateCart = (newCart: Product[]) => {
    setCart(newCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  };

  const addProduct = async (productId: number) => {
    try {
      const { data: ProductData } = await api.get<Product>(
        `products/${productId}`
      );
      const { data: StockData } = await api.get<Stock>(`stock/${productId}`);

      const productInTheCart = cart.find((product) => product.id === productId);

      if (!productInTheCart) {
        if (StockData.amount >= 0) {
          updateCart([...cart, { ...ProductData, amount: 1 }]);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        if (StockData.amount >= productInTheCart.amount + 1) {
          const cartWithProductIncreasedAmount = cart.map((product) => {
            if (product.id === productId) {
              return { ...product, amount: product.amount + 1 };
            }
            return product;
          });
          updateCart(cartWithProductIncreasedAmount);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      updateCart(cart.filter((product) => product.id !== productId));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const isProductInCart = cart.find((product) => product.id === productId);

      if (!isProductInCart || amount <= 0) {
        return;
      }

      const { data: StockData } = await api.get<Stock>(`stock/${productId}`);

      if (StockData.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
      }

      const cartWithUpdatedProductAmount = cart.map((product) => {
        if (product.id === productId) {
          return { ...product, amount };
        }
        return product;
      });

      updateCart(cartWithUpdatedProductAmount);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
