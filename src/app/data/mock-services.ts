import { IService } from '../helpers/models';

export const MOCK_SERVICES: IService[] = [
  { id: '1', name: 'Consulta General',         description: 'Evaluación inicial y diagnóstico preventivo.',                  duration: 30, price: 35000,  isActive: true  },
  { id: '2', name: 'Limpieza Dental Profunda',  description: 'Eliminación de sarro y pulido dental avanzado.',               duration: 45, price: 45000,  isActive: true  },
  { id: '3', name: 'Tratamiento de Conducto',   description: 'Endodoncia especializada para piezas dañadas.',                duration: 60, price: 120000, isActive: true  },
  { id: '4', name: 'Blanqueamiento LED',         description: 'Tratamiento estético de alta gama para una sonrisa brillante.', duration: 45, price: 85000, isActive: false },
];