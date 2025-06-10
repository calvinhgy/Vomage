#!/bin/bash

# Vomage 数据备份脚本
set -e

# 配置
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="vomage_backup_${TIMESTAMP}"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 创建备份目录
create_backup_dir() {
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
    log_info "创建备份目录: ${BACKUP_DIR}/${BACKUP_NAME}"
}

# 备份 MongoDB
backup_mongodb() {
    log_info "备份 MongoDB 数据..."
    
    docker-compose exec -T mongodb mongodump \
        --host localhost:27017 \
        --db vomage \
        --out /tmp/backup
    
    docker cp $(docker-compose ps -q mongodb):/tmp/backup "${BACKUP_DIR}/${BACKUP_NAME}/mongodb"
    
    log_info "✓ MongoDB 备份完成"
}

# 备份 Redis
backup_redis() {
    log_info "备份 Redis 数据..."
    
    docker-compose exec -T redis redis-cli BGSAVE
    sleep 5  # 等待备份完成
    
    docker cp $(docker-compose ps -q redis):/data/dump.rdb "${BACKUP_DIR}/${BACKUP_NAME}/redis_dump.rdb"
    
    log_info "✓ Redis 备份完成"
}

# 备份应用日志
backup_logs() {
    log_info "备份应用日志..."
    
    if [ -d "./logs" ]; then
        cp -r ./logs "${BACKUP_DIR}/${BACKUP_NAME}/logs"
        log_info "✓ 日志备份完成"
    else
        log_warn "日志目录不存在，跳过日志备份"
    fi
}

# 备份配置文件
backup_configs() {
    log_info "备份配置文件..."
    
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}/configs"
    
    # 备份环境变量文件（去除敏感信息）
    if [ -f ".env.production" ]; then
        grep -v -E "(PASSWORD|SECRET|KEY)" .env.production > "${BACKUP_DIR}/${BACKUP_NAME}/configs/env.production.template" || true
    fi
    
    # 备份 Docker 配置
    cp docker-compose.yml "${BACKUP_DIR}/${BACKUP_NAME}/configs/"
    cp Dockerfile "${BACKUP_DIR}/${BACKUP_NAME}/configs/"
    
    # 备份 Nginx 配置
    if [ -d "./nginx" ]; then
        cp -r ./nginx "${BACKUP_DIR}/${BACKUP_NAME}/configs/"
    fi
    
    log_info "✓ 配置文件备份完成"
}

# 压缩备份
compress_backup() {
    log_info "压缩备份文件..."
    
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
    rm -rf "${BACKUP_NAME}"
    cd - > /dev/null
    
    log_info "✓ 备份压缩完成: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
}

# 上传到 S3（如果配置了）
upload_to_s3() {
    if [ -n "${BACKUP_S3_BUCKET}" ] && command -v aws &> /dev/null; then
        log_info "上传备份到 S3..."
        
        aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
            "s3://${BACKUP_S3_BUCKET}/backups/${BACKUP_NAME}.tar.gz"
        
        log_info "✓ 备份已上传到 S3"
    else
        log_warn "S3 配置未找到或 AWS CLI 未安装，跳过 S3 上传"
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份..."
    
    # 保留最近 7 天的本地备份
    find "${BACKUP_DIR}" -name "vomage_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
    
    # 如果配置了 S3，清理 S3 上的旧备份
    if [ -n "${BACKUP_S3_BUCKET}" ] && command -v aws &> /dev/null; then
        # 删除 30 天前的 S3 备份
        aws s3 ls "s3://${BACKUP_S3_BUCKET}/backups/" | \
        while read -r line; do
            backup_date=$(echo $line | awk '{print $1}')
            backup_file=$(echo $line | awk '{print $4}')
            
            if [ -n "$backup_date" ] && [ -n "$backup_file" ]; then
                backup_timestamp=$(date -d "$backup_date" +%s)
                current_timestamp=$(date +%s)
                days_diff=$(( (current_timestamp - backup_timestamp) / 86400 ))
                
                if [ $days_diff -gt 30 ]; then
                    aws s3 rm "s3://${BACKUP_S3_BUCKET}/backups/$backup_file"
                    log_info "删除旧备份: $backup_file"
                fi
            fi
        done
    fi
    
    log_info "✓ 旧备份清理完成"
}

# 发送通知（如果配置了）
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Vomage 备份${status}: ${message}\"}" \
            "${SLACK_WEBHOOK_URL}" > /dev/null 2>&1 || true
    fi
    
    if [ -n "${DISCORD_WEBHOOK_URL}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"Vomage 备份${status}: ${message}\"}" \
            "${DISCORD_WEBHOOK_URL}" > /dev/null 2>&1 || true
    fi
}

# 主备份流程
main() {
    log_info "开始备份 Vomage 数据..."
    
    # 检查服务状态
    if ! docker-compose ps | grep -q "Up"; then
        log_error "服务未运行，无法执行备份"
        exit 1
    fi
    
    # 加载环境变量
    if [ -f ".env.production" ]; then
        source .env.production
    fi
    
    start_time=$(date +%s)
    
    create_backup_dir
    backup_mongodb
    backup_redis
    backup_logs
    backup_configs
    compress_backup
    upload_to_s3
    cleanup_old_backups
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    backup_size=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
    
    log_info "🎉 备份完成！"
    log_info "备份文件: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log_info "备份大小: ${backup_size}"
    log_info "耗时: ${duration} 秒"
    
    send_notification "成功" "备份大小: ${backup_size}, 耗时: ${duration}秒"
}

# 恢复功能
restore() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件"
        echo "用法: $0 restore <backup_file.tar.gz>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    log_warn "⚠️  这将覆盖现有数据，请确认操作！"
    read -p "继续恢复？(y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "恢复操作已取消"
        exit 0
    fi
    
    log_info "开始恢复数据..."
    
    # 解压备份文件
    temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"
    backup_name=$(basename "$backup_file" .tar.gz)
    
    # 停止服务
    docker-compose stop app
    
    # 恢复 MongoDB
    if [ -d "$temp_dir/$backup_name/mongodb" ]; then
        log_info "恢复 MongoDB 数据..."
        docker cp "$temp_dir/$backup_name/mongodb" $(docker-compose ps -q mongodb):/tmp/restore
        docker-compose exec -T mongodb mongorestore --host localhost:27017 --drop /tmp/restore
        log_info "✓ MongoDB 数据恢复完成"
    fi
    
    # 恢复 Redis
    if [ -f "$temp_dir/$backup_name/redis_dump.rdb" ]; then
        log_info "恢复 Redis 数据..."
        docker-compose stop redis
        docker cp "$temp_dir/$backup_name/redis_dump.rdb" $(docker-compose ps -q redis):/data/dump.rdb
        docker-compose start redis
        log_info "✓ Redis 数据恢复完成"
    fi
    
    # 清理临时文件
    rm -rf "$temp_dir"
    
    # 重启服务
    docker-compose start app
    
    log_info "🎉 数据恢复完成！"
    send_notification "恢复成功" "从备份文件: $(basename $backup_file)"
}

# 处理命令行参数
case "${1:-backup}" in
    "backup")
        main
        ;;
    "restore")
        restore "$2"
        ;;
    "list")
        log_info "本地备份文件:"
        ls -lh "${BACKUP_DIR}"/vomage_backup_*.tar.gz 2>/dev/null || log_warn "没有找到备份文件"
        
        if [ -n "${BACKUP_S3_BUCKET}" ] && command -v aws &> /dev/null; then
            log_info "S3 备份文件:"
            aws s3 ls "s3://${BACKUP_S3_BUCKET}/backups/" || log_warn "无法访问 S3 备份"
        fi
        ;;
    *)
        echo "用法: $0 {backup|restore|list}"
        echo ""
        echo "命令说明:"
        echo "  backup           - 执行完整备份"
        echo "  restore <file>   - 从备份文件恢复"
        echo "  list             - 列出所有备份文件"
        exit 1
        ;;
esac
