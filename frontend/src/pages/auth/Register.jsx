import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../state/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  role: z.enum(['manager', 'client']),
  company: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'client'
    }
  });

  const role = watch('role');

  const onSubmit = async (data) => {
    setIsLoading(true);
    const result = await registerUser(data);
    setIsLoading(false);

    if (result.success) {
      toast.success('Conta criada com sucesso!');
      const path = result.user.role === 'manager' ? '/manager/dashboard' : '/client/dashboard';
      navigate(path);
    } else {
      toast.error(result.error || 'Erro ao criar conta');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Criar uma conta
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome completo"
          placeholder="Seu nome"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de conta
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${role === 'client' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 hover:bg-gray-50'}`}>
              <input type="radio" value="client" {...register('role')} className="sr-only" />
              <span className="text-sm font-medium">Cliente</span>
            </label>
            <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${role === 'manager' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 hover:bg-gray-50'}`}>
              <input type="radio" value="manager" {...register('role')} className="sr-only" />
              <span className="text-sm font-medium">Gestor</span>
            </label>
          </div>
        </div>

        <Input
          label="Empresa (opcional)"
          placeholder="Nome da empresa"
          error={errors.company?.message}
          {...register('company')}
        />

        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirmar senha"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" loading={isLoading} className="w-full">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Entrar
        </Link>
      </p>
    </div>
  );
};

export default Register;
