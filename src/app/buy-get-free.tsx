import { DepartmentCategoriesScreen } from './department-categories';
import { BUY_GET_FREE_DEPARTMENT } from '../services/social-metadata';

// Short shareable link for the existing Buy & Get Free department. It reuses the same
// department screen (products, prices, cart and quantity limits), so behaviour is identical
// to /department-categories?id=…&name=Buy%20%26%20Get%20Free.
export default function BuyGetFree() {
  return <DepartmentCategoriesScreen key={BUY_GET_FREE_DEPARTMENT.id}
    departmentId={BUY_GET_FREE_DEPARTMENT.id} departmentName={BUY_GET_FREE_DEPARTMENT.name} />;
}
