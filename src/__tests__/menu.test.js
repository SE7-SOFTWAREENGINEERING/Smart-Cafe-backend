// Mock dependencies
jest.mock('../models/Menu', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
}));
jest.mock('../models/MenuItem', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
}));

const Menu = require('../models/Menu');
const MenuItem = require('../models/MenuItem');
const menuController = require('../controllers/menuController');

describe('Menu Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { query: {}, params: {}, body: {}, user: { userId: 'admin123' } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('getMenus', () => {
    it('should get all menus', async () => {
      const mockMenus = [
        { _id: 'menu1', mealType: 'LUNCH', menuDate: new Date() },
        { _id: 'menu2', mealType: 'DINNER', menuDate: new Date() }
      ];

      Menu.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMenus)
      });

      await menuController.getMenus(mockReq, mockRes, mockNext);

      expect(Menu.find).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ count: 2 })
        })
      );
    });
  });

  describe('getMenuById', () => {
    it('should get menu by ID', async () => {
      mockReq.params = { menuId: 'menu1' };
      const mockMenu = { _id: 'menu1', mealType: 'LUNCH' };

      // Double chainable mock: .populate('items').populate('createdBy', ...)
      Menu.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockMenu)
        })
      });

      await menuController.getMenuById(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 for non-existent menu', async () => {
      mockReq.params = { menuId: 'invalid' };
      
      Menu.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      await menuController.getMenuById(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createMenu', () => {
    it('should create a new menu', async () => {
      mockReq.body = { menuDate: '2026-02-10', mealType: 'LUNCH' };
      const newMenu = { _id: 'newMenu', ...mockReq.body };

      Menu.create.mockResolvedValue(newMenu);

      await menuController.createMenu(mockReq, mockRes, mockNext);

      expect(Menu.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteMenu', () => {
    it('should delete menu and its items', async () => {
      mockReq.params = { menuId: 'menu1' };
      
      MenuItem.deleteMany.mockResolvedValue({ deletedCount: 5 });
      Menu.findByIdAndDelete.mockResolvedValue({ _id: 'menu1' });

      await menuController.deleteMenu(mockReq, mockRes, mockNext);

      expect(MenuItem.deleteMany).toHaveBeenCalledWith({ menuId: 'menu1' });
      expect(Menu.findByIdAndDelete).toHaveBeenCalledWith('menu1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('MenuItem CRUD', () => {
    it('should get menu items', async () => {
      mockReq.params = { menuId: 'menu1' };
      const mockItems = [{ _id: 'item1', itemName: 'Dosa' }];

      MenuItem.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockItems)
      });

      await menuController.getMenuItems(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ count: 1 }) })
      );
    });

    it('should create menu item', async () => {
      mockReq.body = { menuId: 'menu1', itemName: 'Idli', isVeg: true };
      
      Menu.findById.mockResolvedValue({ _id: 'menu1' });
      MenuItem.create.mockResolvedValue({ _id: 'item1', ...mockReq.body });

      await menuController.createMenuItem(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 when creating item for non-existent menu', async () => {
      mockReq.body = { menuId: 'invalid', itemName: 'Test' };
      
      Menu.findById.mockResolvedValue(null);

      await menuController.createMenuItem(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
