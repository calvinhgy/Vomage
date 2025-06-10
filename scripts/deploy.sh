#!/bin/bash

# Vomage 部署脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_requirements() {
    log_info "检查部署要求..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    log_info "✓ 部署要求检查通过"
}

# 检查环境变量文件
check_env_file() {
    log_info "检查环境变量文件..."
    
    if [ ! -f ".env.production" ]; then
        log_error ".env.production 文件不存在"
        log_info "请复制 .env.production.example 并填入正确的配置"
        exit 1
    fi
    
    log_info "✓ 环境变量文件检查通过"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p logs/nginx
    mkdir -p ssl
    mkdir -p backups
    
    log_info "✓ 目录创建完成"
}

# 构建应用
build_app() {
    log_info "构建应用镜像..."
    
    docker-compose build --no-cache app
    
    log_info "✓ 应用构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 启动数据库服务
    docker-compose up -d mongodb redis
    
    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 10
    
    # 启动应用服务
    docker-compose up -d app
    
    # 启动 Nginx
    docker-compose up -d nginx
    
    # 启动监控服务
    docker-compose up -d prometheus grafana
    
    log_info "✓ 所有服务启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查应用健康状态
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            log_info "✓ 应用健康检查通过"
            break
        fi
        
        log_warn "健康检查失败，重试中... ($attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "健康检查失败，部署可能有问题"
        exit 1
    fi
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    docker-compose ps
    
    echo ""
    log_info "访问地址:"
    echo "  应用: http://localhost"
    echo "  Grafana: http://localhost:3001 (admin/admin)"
    echo "  Prometheus: http://localhost:9090"
}

# 主部署流程
main() {
    log_info "开始部署 Vomage..."
    
    check_requirements
    check_env_file
    create_directories
    build_app
    start_services
    health_check
    show_status
    
    log_info "🎉 部署完成！"
}

# 处理命令行参数
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        log_info "停止所有服务..."
        docker-compose down
        log_info "✓ 服务已停止"
        ;;
    "restart")
        log_info "重启服务..."
        docker-compose restart
        log_info "✓ 服务已重启"
        ;;
    "logs")
        docker-compose logs -f ${2:-app}
        ;;
    "status")
        show_status
        ;;
    "backup")
        ./scripts/backup.sh
        ;;
    "update")
        log_info "更新应用..."
        docker-compose pull
        docker-compose up -d --build
        log_info "✓ 应用已更新"
        ;;
    *)
        echo "用法: $0 {deploy|stop|restart|logs|status|backup|update}"
        echo ""
        echo "命令说明:"
        echo "  deploy  - 完整部署应用"
        echo "  stop    - 停止所有服务"
        echo "  restart - 重启服务"
        echo "  logs    - 查看日志 (可指定服务名)"
        echo "  status  - 显示服务状态"
        echo "  backup  - 执行数据备份"
        echo "  update  - 更新应用"
        exit 1
        ;;
esac
